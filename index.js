const { default: axios } = require('axios');
const { verify } = require('crypto');
const exp = require("express");
const fs = require("fs");
const web = exp();
let config;
let pub_config;
if (fs.existsSync("./public_config.json")) pub_config = JSON.parse(fs.readFileSync('./public_config.json').toString());
else pub_config = {}
if (fs.existsSync("./config.json")) config = JSON.parse(fs.readFileSync('./config.json').toString());
else config = {}

let port = config.port == null ? 4500 : config.port;


checkAndCreate();
function checkAndCreate() {
    if (!fs.existsSync("./playlists")) fs.mkdirSync("./playlists");
}



web.use(async function timeLog(req, res, next) {
    var ip = req.ip;
    res.setHeader("Access-Control-Allow-Origin", '*')
    console.log(`Запрос от ${ip}\nПуть: ${req.url.split("?")[0]}\n`)
    next()
});

web.get('/public_config', (req, res) => {
    res.json(pub_config)
})

web.get('/search', async (req, res) => {
    if (req.query.query == null) {
        res.status(400);
        res.json({
            error: {
                code: 400,
                codename: "Bad Request",
                message: "Нет нужных аргументов"
            }
        })
        return;
    }
    let query = req.query.query.toLowerCase();
    let results = [];

    for (i = 0; i < fs.readdirSync('./playlists').length; i++) {
        let file = JSON.parse(fs.readFileSync(`./playlists/${fs.readdirSync('./playlists')[i]}`).toString());
        if (file.id.toLowerCase().includes(query) || file.url.toLowerCase().includes(query) || file.data.title.toLowerCase().includes(query) || file.data.author.toLowerCase().includes(query)) {
            results.push(file)
        }
    }
    let data = {
        total: results.length,
        results: results
    }
    res.json(data)
})

web.get('/upload', async (req, res) => {
    if (req.query.playlist_data == null || req.query.id == null) {
        res.status(400);
        res.json({
            error: {
                code: 400,
                codename: "Bad Request",
                message: "Нет нужных аргументов"
            }
        })
        return;
    }
    let publicID = makeIDPlaylist(7);
    let playlist = JSON.parse(atob(req.query.playlist_data));
    for (i = 0; i < fs.readdirSync('./playlists').length; i++) {
        let file = JSON.parse(fs.readFileSync(`./playlists/${fs.readdirSync('./playlists')[i]}`).toString());
        if (JSON.stringify(file.data) == JSON.stringify(playlist)) {
            publicID = file.url
            break;
        }
    }
    let data = {
        id: req.query.id,
        data: playlist,
        url: publicID
    }
    fs.writeFileSync(`./playlists/${publicID}.json`, JSON.stringify(data, 1))
    res.json(data)
})

web.get('/playlist/:id', async (req, res) => {
    if (!fs.existsSync(`./playlists/${req.params.id}.json`)) {
        res.status(404);
        res.json({
            error: {
                code: 404,
                codename: "Not found",
                message: "Method not found"
            }
        })
    } else res.json(JSON.parse(fs.readFileSync(`./playlists/${req.params.id}.json`).toString()))
})

web.get('/verify', async (req, res) => {
    if (req.query.access != null) {
        fetch('https://api.minecraftservices.com/entitlements/mcstore', {
            method: 'GET', headers: {
                Authorization: `Bearer ${req.query.access}`
            }
        }).then(response => {
            response.json().then(data => {
                if (data.items != null) {
                    if (data.items.length > 0) {
                        res.status(200)
                        res.json({
                            "message": "ok",
                            "ok": true
                        })
                    } else {
                        res.status(401);
                        res.json({
                            error: {
                                code: 401,
                                codename: "Unauthorized",
                                message: ""
                            }
                        })
                    };
                } else {
                    res.status(401);
                    res.json({
                        error: {
                            code: 401,
                            codename: "Unauthorized",
                            message: ""
                        }
                    })
                };
            });
        });
    } else {
        res.status(401);
        res.json({
            error: {
                code: 401,
                codename: "Unauthorized",
                message: ""
            }
        })
    };
})

web.get('/ping', (req, res) => {
    res.json({
        message: "Pong!",
        time: new Date().getTime()
    })
})
web.get('/:id', async (req, res, next) => {
    try {
        let data = await axios(`http://localhost:${port}/playlist/${req.params.id}`)
        res.json(data.data);
    } catch (e) {
        next();
    }
})

web.use(async function (req, res, next) {
    res.status(404);
    res.json({
        error: {
            code: 404,
            codename: "Not found",
            message: "Method not found"
        }
    })
    return;
});

function makeIDPlaylist(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    if (fs.existsSync(`./playlists/${result}`)) return makeIDPlaylist(length)
    return result;
}

const http = require('http'); // Используется HTTP протокол
const server = http.createServer({}, web);
server.listen(port, async () => {
    console.log(`\n-=-=-=-=-=-\n\nWaterPlayer API\n\n-=-=-=-=-=-\nAPI Был успешно запущен!\nПорт: ${port}\n-=-=-=-=-=-\n`)
})