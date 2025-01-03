$(document).ready(function(){

	var device_id;
	var playlist_id;
	var playlist_tracks;
	var current_track;
	var current_artist;
	var current_album;
	var current_releasedate;
	var playlist_over = false;
	var time_left_song = 60;
	var default_songtime = 60;
	var counter;
	var song_number = 1;
	var song_text = 'Roll the dice and guess the category!'
	
	//Creates a timer
	function timer(){		
		$("#Circle_timer").val(time_left_song).trigger('change');
		time_left_song--;
		if (time_left_song < 0) {
			timerRed();
			clearInterval(counter);
			fetch('/pause').catch(error => {console.log(error)});
			return;
		}
		if (time_left_song <= 10 ) {
			shakeTimer();
		}
	}
	//Starts the timer
	function startTimer(){
		counter = setInterval(timer, 1000);
	}
	//Turns timer red and shakes it
	function shakeTimer() {
		$("#Circle_timer").trigger('configure', {'fgColor': '#b80000'});
		$("#Circle_timer").css('color', '#b80000');
		$("#Timer_div").effect("shake", {times: 1, distance: 10});
	}
	//Turns timer green
	function timerGreen(){
		$("#Circle_timer").trigger('configure', {'fgColor': 'green'});
		$("#Circle_timer").css('color', 'green');
	}
	//Turns timer red
	function timerRed(){
		$("#Circle_timer").trigger('configure', {'fgColor': '#b80000'});
		$("#Circle_timer").css('color', '#b80000');
	}
	//Plays next song
	function playNext(){
		//Check if you are at end of playlist
		if (song_number == playlist_tracks.length) {
			playlist_over = true;
			endGame();
		} else {
			song_number++;
		}
		fetch('/play_next').catch(error => {console.log(error)});
		$("#List").empty();
		timerGreen();
		startTimer();
		$(".track_choices").prop("disabled", false);
	}
	//Plays previous song
	function playPrevious(){
		//Check if you are at the beginning of the playlist
		if (song_number == 1) {
			console.log('song number: ', song_number);
		} else {
			song_number--;
		}
		fetch('/play_previous').catch(error => {console.log(error)});
		$("#List").empty();
		timerGreen();
		startTimer();
		$(".track_choices").prop("disabled", false);
	}
	//Gets user devices
	function getDevices(){
		fetch('/get_user_devices')
			.then(e => e.json())
			.then(data => {
				$("#Spinner_div").addClass('hidden');
				//Checks if there are no active devices
				if (Object(data).length == 0) {
					$("#Loading_text").text("No devices found! Please open Spotify on one of your devices"
						+ " and click the button below to try again.");
				} else {
					$("#Loading_text_div").addClass('hidden');
				}
				//Loads device options
				data.forEach(function(device){
					$("#List").append('<li><a href="#" class="device btn btn-outline-success" id=' 
						+ device.id + ' role = "button">' + device.name + '</a></li>');
				});
				$("#List").append('<li><a href="#" id="Reload_devices" class="btn btn-outline-warning"' 
					+ 'role="button">Reload Devices</a></li>');
			}).catch(error => {alert("Problem loading devices: " + error)});
	}
	//Clears screen and shows game over screen
	function endGame(){
		clearInterval(counter);
		$("#List").empty();
		$("#Head_text").addClass("hidden");
		$("#Pause_div").addClass('hidden');
		$("#Reveal_div").addClass('hidden');
		$("#Timer_div").addClass('hidden');
		$("#Playlist_header").addClass('hidden');
		$("#Hearts_div").addClass('hidden');
		fetch('/pause').catch(error => {console.log(error)});
		if (playlist_over) {
			opening_text = "";
			$("#Game_over_text").html("Wow! You completed the playlist!<br/>" + opening_text + "</br>");
		}
		$("#Game_over_div").removeClass('hidden');
		$("#List").append('<li><a href="#" class="btn btn-success" id="Play_again" role="button">Play Again</a></li>');
		$("#List").append('<li><a href="https://accounts.spotify.com/en/logout" '
			+ 'class="btn btn-danger" id="Game_over_logout" role="button">Log Out</a></li>');
	}

	//Load User Devices
	$("#Start_button").click(function(e){
		e.preventDefault();
		$("#Start_game").hide();
		$("#Head_text").text("Which device would you like to listen on?");
		//Loading Text
		$("#Loading_text_div").removeClass('hidden');
		$("#Spinner_div").removeClass('hidden');
		getDevices();
	});
		//Reveal song info button
	$("body").on("click", "#Reveal_button", function(e){
		e.preventDefault();
		$("#List").empty();
		fetch('/get_currenttrack')
		.then(e => e.json())
		.then(data => {
			current_track = data.name;
			current_artist = data.artists.map((a) => a.name).join(', ');
			current_album = data.album.name;
			current_releasedate = data.album.release_date;
			time_left_song = default_songtime;
		}).catch(error => {console.log(error)});
		$("#List").append('<li><a href="#" class="track_choices btn btn-success role=button">Title: ' + current_track + '</a></li>' );
		$("#List").append('<li><a href="#" class="track_choices btn btn-success role=button">Artist: ' + current_artist + '</a></li>' );
		$("#List").append('<li><a href="#" class="track_choices btn btn-success role=button">Album name: ' + current_album + '</a></li>' );
		$("#List").append('<li><a href="#" class="track_choices btn btn-success role=button">Album release date: ' + current_releasedate + '</a></li>' );
		$("#List").append('<a href="#" class="btn btn-outline-success" id="Hidereveal_button" data-toggle="modal" data-backdrop="static" data-keyboard="false">Hide</a>' );
	});
	//Hide song info button
	$("body").on("click", "#Hidereveal_button", function(e){
		$("#List").empty();
	});
	//Reload devices button
	$("body").on("click", "#Reload_devices", function(e){
		e.preventDefault();
		$("#List").empty();
		$("#Loading_text").text("Loading...");
		$("#Loading_text_div").removeClass('hidden');
		$("#Spinner_div").removeClass('hidden');
		getDevices();
	});

	//Load User Playlists
	$("body").on("click", ".device", function(e){
		e.preventDefault();
		$("#Head_text").text("Which playlist would you like to listen to?");
		device_id = $(this).attr("id");
		$("#List").empty();
		fetch('/get_user_playlists')
			.then(e => e.json())
			.then(data => {
				//Adds button for each playlist
				data.forEach(function(playlist){
					$("#List").append('<li><a href="#" class="playlistName btn btn-outline-success" data-id='
						+ playlist.id + ' data-uri =' + playlist.uri +'>' + playlist.name + '</a></li>');
				});	
			}).catch(error => {alert("Problem loading playlists: " + error)});
	});

	//Load Playlist Tracks and Begin Game
	$("body").on("click", ".playlistName", function(e){
		$("#List").empty();
		$("#Playlist_header").text("Playlist: " + $(this).text());
		playlist_id = $(this).attr("data-id");
		playlist_uri = $(this).attr("data-uri");
		$("#List").empty();
		$("#Head_text").text("");
		startTimer();
		fetch('/get_playlist_tracks/' + playlist_id)
			.then(e => e.json())
			.then(data => {
				//Load Playlist Tracks
				$("#Head_text").text(song_text);
				$("#Pause_div").removeClass('hidden');
				$("#Reveal_div").removeClass('hidden');
				$("#Circle_timer").knob({
					'max': default_songtime,
					'readOnly': true,
					'fgColor': 'green'
				});
				$("#Circle_timer").value = default_songtime;
				$("#Timer_div").removeClass('hidden');
				$("#Playlist_header").removeClass('hidden');
				playlist_tracks = data;
				fetch('/play_playlist/' + device_id + '/' + playlist_uri).catch(error => {console.log(error)});
			});
	});

//Pause Menu Buttons
	//Pause Button
	$("#Pause_button").click(function(e){
		e.preventDefault;
		clearInterval(counter);
		fetch('/pause').catch(error => {console.log(error)});
	});
	//Play Button
	$("#Play_button").click(function(e){
		e.preventDefault;
		clearInterval(counter);
		fetch('/play').catch(error => {console.log(error)});
	});
	//Previous Button
	$("#Previous_button").click(function(e){
		e.preventDefault;
		clearInterval(counter);
		playPrevious();
	});
	//Next Button
	$("#Next_button").click(function(e){
		e.preventDefault;
		clearInterval(counter);
		playNext();
	});
	//Resume Button
	$("#Resume_button").click(function(e){
		e.preventDefault;
		startTimer();
		fetch('/play').catch(error => {console.log(error)});
	});

	let page = location;
	//Reload Button
	$("#Reload_button").click(function(e){
		e.preventDefault;
		page.reload();
	});

	$("body").on("click", "#Play_again", function(e){
		page.reload();
	});

});