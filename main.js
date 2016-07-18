var Fs = require("fs");
var Program = require("commander");
var Extend = require("extend");
var Url = require("url");
var Request = require("request");
// var Bigint = require("bigint");
var Crypto = require("crypto");

var Helpers = {
    getRPCID : function(){
        var getRandomInt =  function(min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        };

        return Helpers.getRandomInt(10000000, 99999999) + "36854775807";
        // return bigint("1000000000000000000").rand("9223372036854775807").toString();
    },
    getClientSecret : function(){
        var secret = Crypto.randomBytes(3*16).toString("base64");
        return secret;
    }
};

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
    },
 
};

//Proto
var proto = {
    Req : require("protocol-buffers"),
    Default : {
        HEADERS: { "User-Agent": "Niantic App" },
        API_URL : "https://pgorelease.nianticlabs.com/plfe/rpc",
        LOGIN_URL : "https://sso.pokemon.com/sso/login?service=https%3A%2F%2Fsso.pokemon.com%2Fsso%2Foauth2.0%2FcallbackAuthorize",
        LOGIN_ERROR_URL: "https://www.nianticlabs.com/pokemongo/error",
        LOGIN_OAUTH : "https://sso.pokemon.com/sso/oauth2.0/accessToken",
        PTC_CLIENT_SECRET : "w8ScCUXJQc6kXKw8FiOhd8Fixzht18Dq3PEVkUCP5ZPxtgyWsbTvWHFLm2wNY0JR"
    },
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
                hash: "4a2e9bc330dae60e7b74fc85b98868ab4700802e"
            } 
        };

        var request = {
            unknown1 : 2,
            rpc_id   : Helpers.getRPCID(),
            requests : [req1, req2, req3, req4],
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

    createLoginFirst :function(){
        var requestData = {
            uri    : proto.Default.LOGIN_URL,
            headers: proto.Default.HEADERS,
            method : "GET",
            json   : true
        };

        return {
            request: requestData,
            payload: null
        };
    },

    createLoginSecond :function(username, password, exec, lt){
        var payload = {
            username  : username,
            password  : password,
            execution : exec,
            lt        : lt,
            _eventId  : "submit"
        };
        
        var requestData = {
            uri     : proto.Default.LOGIN_URL,
            headers : proto.Default.HEADERS,
            json    : payload,
            method  : "POST",
            encoding: null
        };

        return {
            request: requestData,
            payload: payload
        };
    },

    createLoginThird :function(username, password, exec, lt){
        var payload = {
            client_id    : "mobile-app_pokemon-go",
            redirect_uri : proto.Default.LOGIN_ERROR_URL,
            client_secret: Helpers.getClientSecret(),
            grant_type   : "refresh_token",
            code         : "",
        };

        var requestData = {
            uri    : proto.Default.LOGIN_OAUTH,
            headers: proto.Default.HEADERS,
            json   : payload,
            method : "POST",
        };

        return {
            request: requestData,
            payload: payload
        };
    },

    login: function(username, password){

    }
};

var PokemonRadar = {
    Http : require("http"),
    Protocol: new proto.PokemonProtocol(),

    DefaultOptions:{
        server:{
            port: 8000,
            bind: "0.0.0.0"
        }
    },

    Login: function(username, password, callback){
        var first = function() {
            var data = PokemonRadar.Protocol.createLoginFirst();

            var req = Request(data.request, function(error, response, body){
                console.log(body, response.headers);

                second(body);
            });
        };

        var second = function(data) {
            var data = PokemonRadar.Protocol.createLoginSecond(username, password, data.execution, data.lt);

            var req = Request(data.request, function(error, response, body){
                console.log(body, response.headers);

                third(body);
            });
        };

        var third = function(data) {
            var data = PokemonRadar.Protocol.createLoginThird();

            var req = Request(data.request, function(error, response, body){
                console.log(body, response.headers);
                
            });
        };

        first();
    },

    Init : function(options){
        PokemonRadar.Login("Minixfortheibm", "Minixfortheibm123", function(){
            console.log("wat");
        })

        var geoCoder = new geo.Coder({location: options.location});

        PokemonRadar.Http.createServer(function (req, res){
            
        }).listen(options.port || PokemonRadar.DefaultOptions.server.port,options.bind || PokemonRadar.DefaultOptions.server.bind);
        
    }
}


var test = function(){
    console.log(Helpers.getClientSecret());
};

Program
    .command("start")
    .option("-l --location", "Sets the location for the radar. Default: 0")
    .option("-p --port", "Sets the port for the server. Default: 8080")
    .option("-b --bind", "Sets the binding for the server. Default: 0.0.0.0")
    .description("Starts the Pokemon radar")
    .action(PokemonRadar.Init);

Program
    .command("test")
    .description("Starts the Pokemon radar")
    .action(test);

Program.parse(process.argv);