var express = require('express');
require('dotenv').config();
var app = express();

//Load ejs
var ejs = require('ejs');
app.set('view engine', 'ejs');
app.set('views', __dirname + '/Views');

app.use(express.static(__dirname));

//Load the Spotify Node API
var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

var scopes = ['playlist-read-private', 'playlist-read-collaborative', 'user-modify-playback-state', 
	'user-read-currently-playing', 'user-read-private', 'user-library-read', 'user-read-playback-state'];

//Sets random values for state
const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
var state = "";
var random;
for (i = 0; i < 15; i++) {
	random = Math.floor(Math.random() * (validChars.length - 1));
	state += validChars.charAt(random);
}

var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

//Homepage
app.get('/', function(req, res){
	res.render('index', {authurl: authorizeURL});
});

var tokenExpirationEpoch;
//Redirect URI
app.get('/callback', function(req, res){
	
	var code = req.query.code;

	spotifyApi.authorizationCodeGrant(code).then(
		function(data) {
		    //Set the access token on the API object to use it in later calls
		    spotifyApi.setAccessToken(data.body['access_token']);
		    spotifyApi.setRefreshToken(data.body['refresh_token']);

			//Save the amount of seconds until the access token expired
		    tokenExpirationEpoch = new Date().getTime() / 1000 + data.body['expires_in'];
		    console.log(
		      'Retrieved token. It expires in ' + Math.floor(tokenExpirationEpoch - new Date().getTime() / 1000) + ' seconds!'
		    );
		    res.redirect('/game');
		},
		function(err) {
	    console.log('Something went wrong!', err);
	  	}
	);
});

//Refreshes the Acces Token
var numberOfTimesUpdated = 0;

setInterval(function() {
//Stop printing and refresh.
if (++numberOfTimesUpdated > 5) {
	clearInterval(this);

	//Refresh token and print the new time to expiration.
	spotifyApi.refreshAccessToken().then(
	function(data) {
		tokenExpirationEpoch = new Date().getTime() / 1000 + data.body['expires_in'];
		console.log(
		'Refreshed token. It now expires in ' + Math.floor(tokenExpirationEpoch - new Date().getTime() / 1000) + ' seconds!'
		);
	},
	function(err) {
		console.log('Could not refresh the token!', err.message);
	}
	);
}}, 1000);

//Game Page
app.get('/game', function(req, res){

	spotifyApi.getMe()
  		.then(function(data) {
  			//console.log(data.body);
  			res.render('game', {
				name: data.body['display_name']
			});
  		}, function(err) {
    		console.log('Something went wrong!', err);
  		});

});

//Loads User Devices and Sends to Page
app.get('/get_user_devices', function(req, res){

	spotifyApi.getMyDevices()
		.then(function(data){
			//Checks if there are no devices active
			if (Object(data.body.devices).length == 0) {
				console.log("ERROR: No devices found!");
			}
			console.log("Device data sent");
			res.send(data.body.devices);
		}, function(err){
			console.log("Something went wrong", err);
		}).catch(error => {console.log(error)});

});

//Loads User Playlists and Sends to Page
app.get('/get_user_playlists', function(req, res){

	spotifyApi.getUserPlaylists()
		.then(function(data){
			console.log("User Playlists Sent");
			res.send(data.body.items);
		}, function(err){
			console.log('Something went wrong!', err);
		}).catch(error => {console.log(error)});

});

var playlist_id;
var track_data;

//Loads Playlists Tracks and Sends to Page
app.get('/get_playlist_tracks/:playlist_id', function(req, res){
	playlist_id = req.params.playlist_id;
	spotifyApi.getPlaylistTracks(playlist_id, { fields: 'items' })
		.then(function(data){
			console.log('This playlist contains tracks');
			res.send(data.body.items);
		}, function(err){
			console.log('Something went wrong!', err);
		}).catch(error => {console.log(error)});
});

//Play Selected Playlist on Selected Device and Sends Track to Page
app.get('/play_playlist/:device_id/:playlist_uri', function(req, res){
	spotifyApi.play({ device_id: req.params.device_id, context_uri: req.params.playlist_uri })
	.then(function() {
		console.log('Playback started');
		//Sets the playback to shuffle
		spotifyApi.setShuffle(true)
  		.then(function() {
			console.log('Shuffle is on.');
			//Skips to next song since it will always begin on first song in playlist
			spotifyApi.skipToNext()
  			.then(function() {
    			console.log('Skip to next');
  			}, function(err) {
    			console.log('Something went wrong!', err);
  			});
		}, function  (err) {
    		console.log('Something went wrong!', err);
  		});
	}, function(err) {
	  console.log('Something went wrong!', err);
	});
});

//Get current playing track
app.get('/get_currenttrack', function(req, res){
	spotifyApi.getMyCurrentPlayingTrack({ device_id: req.params.device_id, context_uri: req.params.playlist_uri })
	.then(function(data) {
		console.log('Now playing: ' + data.body.item.name);
		track_data = data.body.item;
		res.send(track_data);
	}, function(err) {
		console.log('Something went wrong!', err);
	});
});

//Play next song in game and Sends Track to Page
app.get('/play_next', function(req, res){
	spotifyApi.skipToNext({ device_id: req.params.device_id, context_uri: req.params.playlist_uri })
	.then(function() {
		console.log('Skip to next');
	}, function(err) {
		console.log('Something went wrong!', err);
	});
});

//Play previous song in game and Sends Track to Page
app.get('/play_previous', function(req, res){
	spotifyApi.skipToPrevious({ device_id: req.params.device_id, context_uri: req.params.playlist_uri })
	.then(function() {
		console.log('Skip to previous');
	}, function(err) {
		console.log('Something went wrong!', err);
	});
});

//Pauses Music
app.get('/pause', function(req, res){
	spotifyApi.pause({ device_id: req.params.device_id, context_uri: req.params.playlist_uri })
	.then(function() {
	  console.log('Playback paused');
	}, function(err) {
	  console.log('Something went wrong!', err);
	});
});

//Plays Music
app.get('/play', function(req, res){
	spotifyApi.play({ device_id: req.params.device_id, context_uri: req.params.playlist_uri })
	.then(function() {
	  console.log('Playback started');
	}, function(err) {
	  console.log('Something went wrong!', err);
	});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT || 3000, () => console.log("Currently listening on " + PORT));