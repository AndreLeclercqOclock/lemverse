/* eslint-disable prefer-rest-params */

// https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-ljm-api/
meetLowLevel = {
  lowLevel: true,

  api: undefined,
  connection: undefined,
  room: undefined,

  localTracks: [],
  remoteTracks: {},
  isJoined: false,

  onLocalTracks(tracks) {
    l('onLocalTracks', arguments);

    for (let i = 0; i < tracks.length; i++) {
      const id = tracks[i].getId();

      meet.localTracks.push(tracks[i]);

      meet.localTracks[i].addEventListener(
        window.JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
        // eslint-disable-next-line no-loop-func
        t => {
          l('local track muted', t);

          if (t.isMuted()) $(`#${id}`).hide();
          else $(`#${id}`).show();
        },
      );
      meet.localTracks[i].addEventListener(
        window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
        () => l('local track stoped'),
      );
      meet.localTracks[i].addEventListener(
        window.JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
        deviceId => l(`track audio output device was changed to ${deviceId}`),
      );

      if (tracks[i].getType() === 'audio') {
        $('.tracks').append(`<div id='${id}'><audio class="st" autoplay='1' id='${id}'></audio></div>`);
      } else {
        const name = Meteor.user().profile.name || '';
        $('.tracks').append(`<div id='${id}' class="stream"><div class="stream-name">${name}</div><div class="webcam"><video class="st" autoplay='1'></video></div></div>`);
      }
      tracks[i].attach($(`#${id} .st`)[0]);

      if (meet.isJoined) meet.room.addTrack(tracks[i]);

      // debug: create tons of track to test the tracks dom layout
      // for (let x = 0; x < 20; x++) {
      //   if (tracks[i].getType() === 'video') {
      //     $('.tracks').append(`<video autoplay='1' id='${id + x}' />`);
      //   } else {
      //     $('.tracks').append(
      //       `<audio autoplay='1' muted='true' id='${id + x}' />`,
      //     );
      //   }
      //   tracks[i].attach($(`#${id + x}`)[0]);

      //   if (meet.isJoined) meet.room.addTrack(tracks[i]);
      // }
    }
  },

  onRemoteTrackAdded(track) {
    l('onRemoteTrackAdded', arguments);

    if (track.isLocal()) return;

    const participantId = track.getParticipantId();

    if (!meet.remoteTracks[participantId]) meet.remoteTracks[participantId] = [];

    meet.remoteTracks[participantId].push(track);
    const id = track.getId();

    track.addEventListener(
      window.JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
      t => {
        l('remote track muted', t.isMuted());

        if (t.isMuted()) $(`#${id}`).hide();
        else $(`#${id}`).show();
      },
    );
    track.addEventListener(
      window.JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
      t => l('remote track stoped', t),
    );
    track.addEventListener(
      window.JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
      deviceId => l(`track audio output device was changed to ${deviceId}`),
    );

    if (track.getType() === 'audio') {
      $('.tracks').append(`<div id='${id}'><audio class="st" autoplay='1' id='${id}'></audio></div>`);
    } else {
      const participant = meet.room.getParticipants().find(p => p.getId() === participantId);
      const name = participant.getDisplayName() || '';
      $('.tracks').append(`<div id='${id}' class="stream"><div class="stream-name">${name}</div><div class="webcam"><video class="st" autoplay='1'></video></div></div>`);
    }

    track.attach($(`#${id} .st`)[0]);
  },

  onTrackRemoved(track) {
    l('onTrackRemoved', arguments);

    let id;
    if (track.isLocal()) {
      id = track.getId();
      meet.localTracks = _.without(meet.localTracks, track);
    } else {
      const participant = track.getParticipantId();
      id = track.getId();
      meet.remoteTracks[participant] = _.without(meet.remoteTracks[participant], track);
    }

    track.detach($(`#${id} .st`)[0]);
    $(`#${id}`).remove();
  },

  onUserLeft(participant) {
    l('user left', arguments);
    if (!meet.remoteTracks[participant]) return;

    const tracks = meet.remoteTracks[participant];

    for (let i = 0; i < tracks.length; i++) {
      tracks[i].detach($(`#${tracks[i].getId()} .st`)[0]);
      $(`#${tracks[i].getId()}`).remove();
    }

    delete meet.remoteTracks[participant];
  },

  onConnectionSuccess() {
    l('onConnectionSuccess', arguments);

    meet.room = meet.connection.initJitsiConference(kebabCase(meet.roomName), {});
    meet.room.on(window.JitsiMeetJS.events.conference.TRACK_ADDED, meet.onRemoteTrackAdded);
    meet.room.on(window.JitsiMeetJS.events.conference.TRACK_REMOVED, meet.onTrackRemoved);
    meet.room.on(window.JitsiMeetJS.events.conference.CONFERENCE_JOINED, meet.onConferenceJoined);
    meet.room.on(window.JitsiMeetJS.events.conference.USER_JOINED, id => {
      l('user join', arguments);
      meet.remoteTracks[id] = [];
    });
    meet.room.on(window.JitsiMeetJS.events.conference.USER_LEFT, meet.onUserLeft);
    meet.room.on(window.JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, track => {
      l(`${track.getType()} - ${track.isMuted()}`);
    });
    meet.room.on(window.JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED, (userID, displayName) => l(`${userID} - ${displayName}`));
    // meet.room.on(
    //   window.JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
    //   (userID, audioLevel) => l(`${userID} - ${audioLevel}`),
    // );
    meet.room.on(window.JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED, () => l(`${meet.room.getPhoneNumber()} - ${meet.room.getPhonePin()}`));

    meet.room.setDisplayName(Meteor.user().profile.name);

    meet.room.join();
  },

  onConnectionFailed() { l('onConnectionFailed', arguments); },
  onDisconnected() { l('onDisconnected', arguments); },

  onConferenceJoined() {
    l('onConferenceJoined', arguments);
    meet.isJoined = true;
    for (let i = 0; i < meet.localTracks.length; i++) {
      meet.room.addTrack(meet.localTracks[i]);
    }
  },

  open(roomName = Meteor.settings.public.meet.roomDefaultName) {
    meet.api = window.JitsiMeetJS;

    meet.api.init();

    meet.api.setLogLevel(meet.api.logLevels.ERROR);

    meet.connection = new meet.api.JitsiConnection(null, null, {
      hosts: {
        domain: Meteor.settings.public.meet.serverURL,
        muc: 'conference.jitsi.lemverse.com',
      },
      bosh: `${Meteor.absoluteUrl()}/http-bind`,
    });

    meet.connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, meet.onConnectionSuccess);
    meet.connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_FAILED, meet.onConnectionFailed);
    meet.connection.addEventListener(window.JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, meet.onDisconnected);

    // meet.connection.addEventListener(window.JitsiMeetJS.events.connection.DEVICE_LIST_CHANGED, meet.onDisconnected);

    meet.roomName = roomName;

    meet.connection.connect();
  },

  async close() {
    meet.connection.removeEventListener(window.JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED, meet.onConnectionSuccess);
    meet.connection.removeEventListener(window.JitsiMeetJS.events.connection.CONNECTION_FAILED, meet.onConnectionFailed);
    meet.connection.removeEventListener(window.JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED, meet.onDisconnected);

    await Promise.all(meet.localTracks.map(t => t.dispose()));
    meet.localTracks = [];

    if (meet.room) {
      await meet.room.leave();
      meet.room = undefined;
    }
    if (meet.connection) {
      meet.connection.disconnect();
      meet.connection = undefined;
    }
    if (meet.api) meet.api = undefined;

    meet.isJoined = false;
  },

  show(value) {
    this.nodeElement().classList.toggle('show', !!value);
  },

  fullscreen(value) {
    this.nodeElement().classList.toggle('fullscreen', !!value);
  },

  mute() {
    const track = meet.localTracks.find(t => t.getType() === 'audio');
    if (!track) return;
    track.dispose();
  },

  unmute() {
    window.JitsiMeetJS.createLocalTracks({
      micDeviceId: Meteor?.user()?.profile?.audioRecorder,
      devices: ['audio'],
    }).then(meet.onLocalTracks);
  },

  hide() {
    const track = meet.localTracks.find(t => t.getType() === 'video' && t.getVideoType() === 'camera');
    if (!track) return;
    track.dispose();
  },

  unhide() {
    window.JitsiMeetJS.createLocalTracks({
      cameraDeviceId: Meteor?.user()?.profile?.videoRecorder,
      devices: ['video'],
    }).then(meet.onLocalTracks);
  },

  shareScreen() {
    l('shareScreen', arguments);
    window.JitsiMeetJS.createLocalTracks({ devices: ['desktop'] }).then(meet.onLocalTracks);
  },

  unshareScreen() {
    l('unshareScreen', arguments);
    const track = meet.localTracks.find(t => t.getType() === 'video' && t.getVideoType() === 'desktop');
    if (!track) return;
    track.dispose();
  },

  nodeElement() {
    if (!this.node) this.node = document.querySelector('#meet');
    return this.node;
  },

  userName(name) {
    meet.room.setDisplayName(name);
  },
};