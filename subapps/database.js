var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Database Init.
var mongoUsername = (process.env.MONGOUSER || "TestDBUser");
var mongoPassword = (process.env.MONGOPASS || "TestDBPass");
var mongoDatabase = (process.env.MONGODATA || "sleepychat");
var mongoDataport = (process.env.MONGOPORT || "47610");
var mongoUri = (process.env.ISHEROKU == "1" ? "mongodb://"+mongoUsername+":"+mongoPassword+"@ds"+mongoDataport+".mongolab.com:"+mongoDataport+"/"+mongoDatabase : "localhost:47610/"+mongoDatabase);
mongoose.connect(mongoUri);
console.log("Connecting to DB: "+mongoUri);
var db = mongoose.connection;

// DB Events
db.on('error', function(err) {
	
	if (err) console.log('Error: '+err);
});
db.on('open', function (callback) {
	
	console.log("DB connected!");
});
db.on('reconnected', function (callback) {
	
	console.log("DB restored!");
});
db.on('disconnected', function (callback) {
	
	console.log("DB disconnected!");
});

var banSchema = mongoose.Schema({
	
	name: String,
	ip: String,
	days: Number,
	date: Number
});

banSchema.set('autoindex', false);
banSchema.set('collection', 'chatbans');

var Ban = mongoose.model('Ban', banSchema);

module.exports = {
		
	Database: db,
	Ban: Ban
};