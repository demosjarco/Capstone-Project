const Eris = require("eris");
const mysql = require("mysql");
const jsftp = require("jsftp");
const secretKeys = require("./secret-keys.js");

var loading = false;
var queries = {};
var channels = {};

const pool  = mysql.createPool({
	connectionLimit: 50,
	host: secretKeys.dbHost,
	user: secretKeys.dbUser,
	password: secretKeys.dbPass,
	database: secretKeys.dbDb,
	supportBigNumbers: false,
});
const ftp = new jsftp({
	host: secretKeys.ftpHost,
	user: secretKeys.ftpUser,
	pass: secretKeys.ftpPass
})

const bot = new Eris.CommandClient(secretKeys.botToken, {
	autoreconnect: true,
	compress: true,
	maxShards: "auto",
}, {
	defaultCommandOptions: {
		caseInsensitive: true
	}
});
bot.on("ready", () => {
	console.log("Jukebox Ready!");
});
bot.on("error", (err, id) => {
	console.error(err);
	bot.disconnect({reconnect: "auto"});
});

bot.connect();

const mainCommand = bot.registerCommand("search", (msg, args) => {
	// Delete existing search for new search
	if (queries[msg.channel.guild.id] != undefined) delete queries[msg.channel.guild.id];
	
	var searchResults = [];
	var searchTermLoopCounter = 0;
	function searchTermLoop(searchTerm) {
		pool.getConnection(function(err1, connection1) {
			if (err1) throw err1;
			const searchTerms = connection1.escape(args.join(" "));

			connection1.query("SELECT t.trackId, t.filename, a.artistName, e.eventName, e.folderName as eventF, l.locationName, l.folderName as locationF, YEAR(t.date) AS year FROM tracks t JOIN tracks_artists ta ON (t.trackId = ta.trackId) JOIN artists a ON (a.artistId = ta.artistId) JOIN events_locations_tracks elt ON (elt.trackId = t.trackId) JOIN `events` e ON (e.eventId = elt.eventId) JOIN locations l ON (l.locationId = elt.locationId) WHERE a.artistName LIKE " + connection1.escape(searchTerm + "%") + " OR e.eventName LIKE " + connection1.escape(searchTerm + "%") + " OR l.locationName LIKE " + connection1.escape(searchTerm + "%") + " OR (t.date >= str_to_date(" + connection1.escape(searchTerm + "-01-01") + ", '%Y-%m-%d') AND t.date <= str_to_date(" + connection1.escape(searchTerm + "-12-31") + ", '%Y-%m-%d')) GROUP BY t.trackId ORDER BY t.trackId DESC", function(error1, results1, fields1) {
				connection1.release();
				
				if (error1) throw error1;
				
				var resultsLoopCounter = 0;
				function resultsLoop(result) {
					var exists = false;
					searchResults.forEach(function(existingResultDict) {
						if (existingResultDict.trackDict.trackId == result.trackId) {
							exists = true;
							existingResultDict.accuracy = existingResultDict.accuracy + 1;
						}
					});
					
					pool.getConnection(function(err2, connection2) {
						if (err2) throw err2;
						
						connection2.query("SELECT a.artistName FROM artists a JOIN tracks_artists ta ON (a.artistId = ta.artistId) JOIN tracks t ON (t.trackId = ta.trackId) WHERE t.trackId = ?", [result.trackId], function(error2, results2, fields2) {
							// And done with the connection.
							connection2.release();

							// Handle error after the release.
							if (error2) throw error2;
							
							result.artistName = "";
							results2.forEach(function(artistResult, tempIndex) {
								if (tempIndex == 0) {
									result.artistName = artistResult.artistName;
								} else {
									result.artistName = result.artistName + " | " + artistResult.artistName;
								}
							});

							if (!exists) {
								searchResults.push({
									trackDict: result,
									accuracy: 1
								});
							}
							
							resultsLoopCounter++;
							if (resultsLoopCounter < results1.length) {
								resultsLoop(results1[resultsLoopCounter]);
							} else {
								// Finish results loop
								searchTermLoopCounter++;
								if (searchTermLoopCounter < args.length) {
									// Still more search terms
									searchTermLoop(args[searchTermLoopCounter]);
								} else {
									// Done
									if (searchResults.length > 1) {
										// Order by most accurate (highest number on .accuracy)
										searchResults.sort(function(a, b) {
											return b.accuracy - a.accuracy;
										});

										// Limit to 11 results
										var temp = [];
										searchResults.splice(0, 11).forEach(function(oldResult) {
											temp.push(oldResult.trackDict);
										});
										// Make into raw array without accuracy key

										queries[msg.channel.guild.id] = {
											results: [
												temp
											]
										};
										var resultFields = [];
										temp.forEach(function(item, index) {
											resultFields.push({
												name: "Result " + index + ": " + item.artistName,
												value: item.eventName + " " + item.locationName + " " + item.year,
												inline: true
											});
										});
										msg.channel.createMessage({embed: {
											title: "Result for " + searchTerms,
											description: "Please select a result from below using `!beats edm <result number>`.\nExample: `!beats edm 1`",
											color: 0xFF8000,
											fields: resultFields
										}}).then((message) => {
											for (var i = 0; i < resultFields.length; i++) {
												message.addReaction(emojis[i]);
											}
											queries[msg.channel.guild.id].msg = {
												channel: message.channel.id,
												id: message.id,
											}
											console.log(queries);
										});
									} else if (searchResults.length == 1) {
										// Only 1 result - play it
										if (msg.member.voiceState.channelID == null) {
											bot.createMessage(msg.channel.id, {embed: {
												title: "Error",
												description: "You must be in a voice channel before doing this command. Please try your search again",
												color: 0xFF0000
											}});
											return "";
										} else {
											loading = true;
											bot.joinVoiceChannel(msg.member.voiceState.channelID).catch((err) => { // Join the user's voice channel
												bot.createMessage(msg.channel.id, "Error joining voice channel. Error: " + err.message); // Notify the user if there is an error
												console.error(err); // Log the error
											}).then((connection) => {
												channels[msg.channel.guild.id] = {voiceChannel: msg.member.voiceState.channelID, player: connection};
												if (Object.keys(channels).length > 0)  {
													bot.editStatus("online", {
														name: "Fire on " + Object.keys(channels).length + "/" + Object.keys(bot.guildShardMap).length + " servers"
													});
												} else {
													bot.editStatus("idle", null);
												}
												if (connection.playing) { // Stop playing if the connection is playing something
													connection.stopPlaying();
												}
												connection.play("ftp://" + secretKeys.ftpUser + ":" + secretKeys.ftpPass + "@" + secretKeys.ftpHost + "/mnt/main/Music/EDM_Music/" + searchResults[0].trackDict.eventF + "/" + searchResults[0].trackDict.year + "/" + searchResults[0].trackDict.locationF + "/" + searchResults[0].trackDict.filename, {
													sampleRate: bot.getChannel(connection.channelID).bitrate
												});
												pool.getConnection(function(err99, connection99) {
													if (err99) throw err99;

													connection99.query("UPDATE tracks SET plays = plays + 1 WHERE trackId = " + searchResults[0].trackDict.trackId, function(error99, results99, fields99) {
														connection99.release();

														if (error99) throw error99;
													});
												});
												loading = false;
												bot.createMessage(msg.channel.id, {embed: {
													title: "Playing " + searchResults[0].trackDict.artistName,
													description: "Use `!beats stop` to manually stop playing otherwise I will auto leave once song over.",
													color: 0x00FF00,
													footer: {
														text: searchResults[0].trackDict.eventName + " " + searchResults[0].trackDict.locationName + " " + searchResults[0].trackDict.year,
														icon_url: searchResults[0].trackDict.eventIcon
													},
													author: {
														name: searchResults[0].trackDict.artistName,
														icon_url: searchResults[0].trackDict.artistIcon
													}
												}});
												connection.on("warn", (message) => {
													console.warn(message);
												});
												connection.on("error", (err) => {
													console.error(err);
												});
												connection.on("end", () => {
													// Only leave channel if song ended because it really ended, not because chose a different song
													if (!loading && !connection.paused) {
														delete channels[bot.getChannel(connection.channelID).guild.id];
														if (Object.keys(channels).length > 0)  {
															bot.editStatus("online", {
																name: "Fire on " + Object.keys(channels).length + "/" + Object.keys(bot.guildShardMap).length + " servers"
															});
														} else {
															bot.editStatus("idle", null);
														}
														bot.leaveVoiceChannel(connection.channelID);
													}
												});
											});
										}
									} else {
										// No result
										bot.createMessage(msg.channel.id, {embed: {
											title: "Error",
											description: "No result. Please try again. You may leave it blank (`!beats edm`) without any search term and it will list all.",
											color: 0xFF0000
										}});
									}
								}
							}
						});
					});
				}
				if (results1.length > 0) {
					resultsLoop(results1[resultsLoopCounter]);
				}
			});
		});
	}
	// Run first time
	searchTermLoop(args[searchTermLoopCounter]);
}, {
	argsRequired: true,
	description: "Search for tracks based on artist, event, year, and/or location",
	fullDescription: "Search for tracks based on artist, event, year, and/or location",
});

const emojis = [
	":3020e3:443079256529043456",
	":3120e3:443079256671518720",
	":3220e3:443079256554078208",
	":3320e3:443079256575180810",
	":3420e3:443079256575311872",
	":3520e3:443079256508071937",
	":3620e3:443079256478580736",
	":3720e3:443079256562466826",
	":3820e3:443079256608604180",
	":3920e3:443079256491425792",
	":1f51f:443080289552433183",
	":23ef:443080301128843275",
	":23f9:443080310784000040"
];