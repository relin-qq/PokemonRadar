var Fs = require("fs");
var Program = require("commander");
var Extend = require("extend");

//Geo
var geo = {
    Req : require("node-geocoder"),

    DefaultOptions : { 
        init: { 
            provider: "google", 
            httpAdapter: "https",
            formatter : null
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



//

//Proto
proto = {}
proto.PokemonBuf = function(){
    var self =  this;

    var protobuf = require("protocol-buffers");
    var messages = protobuf(Fs.readFileSync("pokemon-go.proto"));

    self = messages;

    // pass a proto file as a buffer/string or pass a parsed protobuf-schema object
    

    // var buf = messages.Test.encode({
    //   num: 42,
    //   payload: 'hello world'
    // })

    // console.log(buf) // should print a buffer
    // To decode a message use Test.decode

    // var obj = messages.Test.decode(buf)
    // console.log(obj) // should print an object similar to above
    // Enums are accessed in the same way as messages

    // var buf = messages.AnotherOne.encode({
    //   list: [
    //     messages.FOO.BAR
    //   ]
    // })
    // Nested emums are accessed as properties on the corresponding message

    // var buf = message.SomeMessage.encode({
    //   list: [
    //     messages.SomeMessage.NESTED_ENUM.VALUE
    //   ]
    // })
    // 
};
//

var init = function(options){
    var pokeBuf = new proto.PokemonBuf();

    var geoCoder = new geo.Coder({
        location: options.location
    });

    console.log(geoCoder.getLocation(function(res){
        console.log(res)
    }));
};


Program
    .command("start")
    .option("-l --location", 'Sets the location for the radar. Default: 0')
    .description("Starts the Pokemon radar")
    .action(init);

Program.parse(process.argv);