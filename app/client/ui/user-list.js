Template.userListEntry.helpers({
  admin() { return this.user.roles?.admin; },
  guild() { return Guilds.findOne(this.user.guildId)?.name; },
  zone() {
    if (!this.user.status.online) return '-';
    return this.user.profile.zoneName || '-';
  },
  canEditLevel() { return isEditionAllowed(this.user._id); },
  communicationAllowed() { return this.user._id !== Meteor.userId() && !Meteor.user().profile.guest; },
  levelOwner() { return isLevelOwner(this.user._id); },
  user() { return this.user; },
});

Template.userList.onCreated(function () {
  this.hasLevelRights = Meteor.user().roles?.admin || isLevelOwner(Meteor.userId());
  this.subscribe('guilds');
});

Template.userList.helpers({
  canEditPermissions() { return Template.instance().hasLevelRights; },
  users() {
    const { levelId } = Meteor.user().profile;

    const users = Meteor.users.find(
      { 'profile.guest': { $not: true } },
      { sort: { 'profile.name': 1 } },
    ).fetch();

    users.map(usr => {
      if (usr.profile.levelId !== levelId) usr.profile.zoneName = 'In another level';
      else {
        const zone = Zones.findOne({
          x1: { $lte: usr.profile.x },
          x2: { $gte: usr.profile.x },
          y1: { $lte: usr.profile.y },
          y2: { $gte: usr.profile.y },
        });

        if (zone && zone.name && !zone.hideName) usr.profile.zoneName = zone.name;
      }

      return usr;
    });

    users.sort((a, b) => a.profile.name.toLowerCase().localeCompare(b.profile.name.toLowerCase()));

    return users;
  },
  title() {
    const usersCount = Meteor.users.find(
      { 'profile.guest': { $not: true }, 'status.online': true },
    ).count();
    const guestsCount = Meteor.users.find({ 'profile.guest': { $exists: true } }).count();

    return `Users (${usersCount} online) ${guestsCount > 0 ? `(and ${guestsCount} 👻)` : ''}`;
  },
});

Template.userList.events({
  'click .js-toggle-edition'() { Meteor.call('toggleLevelEditionPermission', this._id); },
  'click .js-profile'() { Session.set('modal', { template: 'profile', userId: this._id, append: true }); },
  'click .js-create-quest'() {
    Session.set('modal', undefined);
    createQuestDraft([this._id], Meteor.userId());
  },
  'click .js-send-message'() {
    Session.set('modal', undefined);

    const channel = [this._id, Meteor.userId()].sort().join(';');
    messagesModule.changeMessagesChannel(channel);
    openConsole();
  },
  'click .js-guild'() { Session.set('modal', { template: 'guild', guildId: this.guildId, append: true }); },
});
