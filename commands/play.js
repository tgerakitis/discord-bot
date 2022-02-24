const { GuildMember, Interaction, Message } = require('discord.js');
const { QueryType } = require('discord-player');

module.exports = {
  name: 'play',
  description: 'Play a song in your channel!',
  options: [
    {
      name: 'query',
      type: 3, // 'STRING' Type
      description: 'The song you want to play',
      required: true,
    },
  ],
  async execute(messageOrInteraction, player) {
    const isInteraction = messageOrInteraction instanceof Interaction;
    try {
      if (isInteraction) {
        if (!(messageOrInteraction.member instanceof GuildMember) || !messageOrInteraction.member.voice.channel) {
          return void messageOrInteraction.reply({
            content: 'You are not in a voice channel!',
            ephemeral: true,
          });
        }
        await messageOrInteraction.deferReply();
      }

      if (
        messageOrInteraction.guild.me.voice.channelId &&
        messageOrInteraction.member.voice.channelId !== messageOrInteraction.guild.me.voice.channelId
      ) {
        const reply = 'You are not in my voice channel!';
        if (isInteraction) {
          return void messageOrInteraction.followUp({
            content: reply,
            ephemeral: true,
          });
        }
        return void messageOrInteraction.channel.send(reply);
      }
      let query = '';
      if (isInteraction) {
        query = messageOrInteraction.options.get('query').value;
      } else {
        query = messageOrInteraction.content.replace('!play', '').trim();
        if (query === '') {
          return void messageOrInteraction.channel.send('empty search query!');
        }
      }
      /**
       * (async () => {
  const playlist = await ytpl(playlistId);
  const items = playlist.items.slice(0, limit);
  console.log(items);

  for (const { id, title, url } of items) {
    console.log('Downloading', title);
    const stream = ytdl(url).pipe(fs.createWriteStream(`${id}.mp4`));
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
})().catch(console.error);

       */
      player.use("YOUTUBE_DL", require("@discord-player/downloader").Downloader);
      let requestedBy = '';
      if (isInteraction) {
        requestedBy = messageOrInteraction.user;
      } else {
        requestedBy = messageOrInteraction.author;
      }
      const searchResult = await player
        .search(query, {
          requestedBy: requestedBy,
          searchEngine: QueryType.AUTO,
        })
        .catch(() => { });
      if (!searchResult || !searchResult.tracks.length) {
        const reply = 'No results were found!';
        if (isInteraction) {
          return void messageOrInteraction.followUp({ content: reply });
        }
        return void messageOrInteraction.channel.send(reply);
      }
      const queue = await player.createQueue(messageOrInteraction.guild, {
        ytdlOptions: {
          quality: "highest",
          filter: "audioonly",
          liveBuffer: 180000,
          //highWaterMark: 1<<25,
          dlChunkSize: 0,
        },
        metadata: messageOrInteraction.channel,
      });

      try {
        if (!queue.connection) await queue.connect(messageOrInteraction.member.voice.channel);
      } catch (error) {
        void player.deleteQueue(messageOrInteraction.guildId);
        const reply = 'Could not join your voice channel!';
        if (isInteraction) {
          return void messageOrInteraction.followUp({
            content: reply,
          });
        }
        return void messageOrInteraction.channel.send(reply);
      }
      const loadingMessage = `⏱ | Loading your ${searchResult.playlist ? 'playlist' : 'track'}...`;
      if (isInteraction) {
        await messageOrInteraction.followUp({
          content: loadingMessage,
        });
      } else {
        await messageOrInteraction.channel.send(loadingMessage);
      }
      searchResult.playlist ? queue.addTracks(searchResult.tracks) : queue.addTrack(searchResult.tracks[0]);
      if (!queue.playing) await queue.play();
    } catch (error) {
      console.log(error);
      const reply = 'There was an error trying to execute that command: ' + error.message;
      if (isInteraction) {
        messageOrInteraction.followUp({
          content: reply,
        });
      }
      return void messageOrInteraction.channel.send(reply);
    }
  }
};
