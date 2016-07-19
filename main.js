var Fs = require("fs");
var Program = require("commander");
var Extend = require("extend");
var Url = require("url");
var Request = require("request");
Request = Request.defaults({jar: true})
// var Bigint = require("bigint");
var Crypto = require("crypto");
var Util = require("util");
var Chalk = require("chalk");
var QueryString = require("querystring");

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
    },
    log: function(msg) {
        var date = new Date();
        var date = Util.format("[%s:%s:%s.%s]", date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
        console.log.apply(console, [Chalk.green(date)].concat(Array.prototype.slice.call(arguments)));
    },
    error: function(msg) {
        var date = new Date();
        var date = Util.format("[%s:%s:%s.%s]", date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
        console.log.apply(console, [Chalk.red(date)].concat(Array.prototype.slice.call(arguments)));
    },
    getJson : function(data){
        try{
            return JSON.parse(data);
        }catch(e){
            Helpers.error("Error while JSON parsing");
        }

        return null
    },
    retry: function(func, timeout){
        setTimeout(func, timeout);
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
        Helpers.log(this._coder)

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
        HEADERS          : { "User-Agent": "Niantic App" },
        // PTC_CLIENT_SECRET: "w8ScCUXJQc6kXKw8FiOhd8Fixzht18Dq3PEVkUCP5ZPxtgyWsbTvWHFLm2wNY0JR",
        API_URL          : "https://pgorelease.nianticlabs.com/plfe/rpc",
        LOGIN_URL        : "https://sso.pokemon.com/sso/login?service=https%3A%2F%2Fsso.pokemon.com%2Fsso%2Foauth2.0%2FcallbackAuthorize",
        LOGIN_ERROR_URL  : "https://www.nianticlabs.com/pokemongo/error",
        LOGIN_OAUTH      : "https://sso.pokemon.com/sso/oauth2.0/accessToken"
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
            url    : proto.Default.LOGIN_URL,
            headers: proto.Default.HEADERS,
            method : "GET",
            followRedirect: false,
            strictSSL: false
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
            "_eventId"  : "submit"
        };
        
        var requestData = {
            url     : proto.Default.LOGIN_URL,
            headers : proto.Default.HEADERS,
            form    : payload,
            method  : "POST",
            strictSSL: false,
            followRedirect: false,
        };

        return {
            request: requestData,
            payload: payload
        };
    },

    createLoginThird :function(ticket){
        var payload = {
            client_id    : "mobile-app_pokemon-go",
            redirect_uri : proto.Default.LOGIN_ERROR_URL,
            client_secret: Helpers.getClientSecret(),
            grant_type   : "refresh_token",
            code         : ticket,
        };

        var requestData = {
            url    : proto.Default.LOGIN_OAUTH,
            headers: proto.Default.HEADERS,
            form   : payload,
            method : "POST",
            strictSSL: false
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
            Helpers.log("Login: (1/3) Sending first request...");

            var data = PokemonRadar.Protocol.createLoginFirst();

            var req = Request(data.request, function exec(error, response, body){
                var json = Helpers.getJson(body);
                
                if(!json)
                    return Helpers.retry(first, 1000);

                second(json);
            });
        };

        var second = function(data) {
            Helpers.log("Login: (2/3) Sending second request...");

            var data = PokemonRadar.Protocol.createLoginSecond(username, password, data.execution, data.lt);

            var req = Request(data.request, function(error, response, body){
                var json = Helpers.getJson(body);

                if(json.errors)
                    return Helpers.error(json.errors[0]);
                
                third({ location: response.headers.location });
            });
        };

        var third = function(data) {
            Helpers.log("Login: (3/3) Sending third request...");

            var params = QueryString.parse(Url.parse(data.location).query);
            var data = PokemonRadar.Protocol.createLoginThird(params.ticket);

            var req = Request(data.request, function(error, response, body){
                Helpers.log(body)
            });
        };

        first();
    },

    Init : function(options){
        PokemonRadar.Login(options.username, options.username, function(){
            Helpers.log("wat");
        })

        var geoCoder = new geo.Coder({location: options.location});

        PokemonRadar.Http.createServer(function (req, res){
            
        }).listen(options.port || PokemonRadar.DefaultOptions.server.port,options.bind || PokemonRadar.DefaultOptions.server.bind);
        
    }
}


var test = function(){
    Helpers.log(Helpers.getClientSecret());
};

Program
    .command("start")
    .option("-l, --location <location>", "Sets the location for the radar. Default: 0")
    .option("-p, --port <port>", "Sets the port for the server. Default: 8080")
    .option("-b, --bind <bind>", "Sets the binding for the server. Default: 0.0.0.0")
    .option("-x, --password <password>", "Sets login password to the PTC login.")
    .option("-u, --username <username>", "Sets login user name to the PTC login.")
    .description("Starts the Pokemon radar")
    .action(PokemonRadar.Init);

Program
    .command("test")
    .description("Random Tests")
    .action(test);

Program.parse(process.argv);