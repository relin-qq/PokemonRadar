var Fs = require("fs");
var Program = require("commander");
var Extend = require("extend");
var Url = require("url");

//Geo
var geo = {
    Req : require("node-geocoder"),

    DefaultOptions : { 
        init: { 
            provider: "google", 
            httpAdapter: "https",
        },
        location: "Broadway New York"
    },

    Coder : function(argOpt) {
        var self = this;
        self.options = {};

        Extend(self.options, geo.DefaultOptions, argOpt);

        self._coder = geo.Req(self.options.init);
    }
};

geo.Coder.prototype = {
    _coder: {},
    getLocation: function(callback){
        console.log(this._coder)

        this._coder.geocode(this.options.location, function(err, res){
            if(err)
                return console.error("Geo Error: %s", err);

            callback(res);
        });
    }
};

//Proto
proto = {
    Req : require("protocol-buffers")
};

proto.PokemonProtocol = function(){
    var self =  this;
    self.messages = proto.Req(Fs.readFileSync("pokemon-go.proto"));
};

proto.PokemonProtocol.prototype = {
    //WTF are those values ?
    createAPIRequest : function(location, token) {
        var req1 = { type: 2 };
        var req2 = { type: 126 };
        var req3 = { type: 4 };
        var req4 = { type: 129 };
        var req5 = { 
            type: 5, 
            message : { 
                unknown4: "4a2e9bc330dae60e7b74fc85b98868ab4700802e"
            } 
        };

        var request = {
            unknown1 : 2,
            rpc_id   : 8145806132888207460,
            requests : [2, 126, 4, 129],
            longitude: location.longitude,
            latitude : location.latitude,
            altitude : location.altitude,
            unknown12: 989,
            requests : [req1, req2, req3, req4, req5],
            auth: {
                provider: "ptc",
                token: {
                    unknown13: 59,
                    contents : token
                }
            }

        }

        return self.messages.RequestEnvelop.encode(request);
    },

    login: function(username, password){

    }
};

var PokemonRadar = {
    Http : require("http"),
    Https: require("https"),

    Default : {
        HEADERS: { "User-Agent": "Niantic App" },
        API_URL : "https://pgorelease.nianticlabs.com/plfe/rpc",
        LOGIN_URL : "https://sso.pokemon.com/sso/login?service=https%3A%2F%2Fsso.pokemon.com%2Fsso%2Foauth2.0%2FcallbackAuthorize",
        LOGIN_ERROR_URL: "https://www.nianticlabs.com/pokemongo/error",
        LOGIN_OAUTH : "https://sso.pokemon.com/sso/oauth2.0/accessToken",
        PTC_CLIENT_SECRET : "w8ScCUXJQc6kXKw8FiOhd8Fixzht18Dq3PEVkUCP5ZPxtgyWsbTvWHFLm2wNY0JR"
    },

    DefaultOptions:{
        server:{
            port: 8000,
            bind: "0.0.0.0"
        },
        client:{
            post: {
                login:{
                    fst: {
                        data: {
                            "lt": "",
                            "execution": "",
                            "_eventId": "submit",
                            "username": "",
                            "password": ""
                        },
                        request: {
                            host: Url.parse(PokemonRadar.Default.LOGIN_URL).host,
                            path: Url.parse(PokemonRadar.Default.LOGIN_URL).path,
                            headers: Default.HEADERS,
                            method: "POST",
                            rejectUnauthorized: false
                        }
                    },
                    sec: {
                        data: {
                            "client_id": "mobile-app_pokemon-go",
                            "redirect_uri": PokemonRadar.Default.LOGIN_ERROR_URL,
                            "client_secret": "",
                            "grant_type": "refresh_token",
                            "code": "",
                        },
                        request: {
                            host: Url.parse(PokemonRadar.Default.LOGIN_OAUTH).host,
                            path: Url.parse(PokemonRadar.Default.LOGIN_OAUTH).path,
                            headers: Default.HEADERS,
                            method: "POST",
                            rejectUnauthorized: false
                        }
                    }
                }
            },

            get:{
                login:{
                    request: {
                        host: Url.parse(PokemonRadar.Default.LOGIN_URL).host,
                        path: Url.parse(PokemonRadar.Default.LOGIN_URL).path,
                        headers: Default.HEADERS,
                        method: "GET",
                        rejectUnauthorized: false
                    }
                }
            }
        }
    },

    Login: function(username, password, callback){
        var first = function(response) {
            response.setEncoding("utf8");

            var data = [];

            response.on("data", function(chunk) {
                data.push(chunk);
            });

            response.on("end", function() {
                second(JSON.parse(data.join("")));
            });

            response.on("error", function(err) {
                console.error("Error during HTTP request");
                console.error(err.message);
            });
        };

        var second = function(data) {
            var payload = {};
            Extend(payload, PokemonRadar.DefaultOptions.post.login.first, {
                username: username,
                password: password,
                execution: data.execution,
                lt: data.lt,
            });

            var request = DefaultOptions.client.post.login.fst.request;
            request.json = payload;

            var req = PokemonRadar.Https.request(request, third);
        };

        var third = function(data) {

        };

        var req = PokemonRadar.Https.request(DefaultOptions.client.get.login.request);
    },

    Init : function(options){
        var pokeProtocol = new proto.PokemonProtocol();
        var geoCoder = new geo.Coder({location: options.location});

        PokemonRadar.Http.createServer(function (req, res){
            
        }).listen(options.port || PokemonRadar.DefaultOptions.server.port,options.bind || PokemonRadar.DefaultOptions.server.bind);
        
    }
}

Program
    .command("start")
    .option("-l --location", "Sets the location for the radar. Default: 0")
    .option("-p --port", "Sets the port for the server. Default: 8080")
    .option("-b --bind", "Sets the binding for the server. Default: 0.0.0.0")
    .description("Starts the Pokemon radar")
    .action(PokemonRadar.Init);

Program.parse(process.argv);