const dropItemDistance = 45;

Template.inventoryItem.onCreated(function () {
  this.item = Items.findOne(this.data.item.itemId);
});

Template.inventoryItem.helpers({
  exist() { return Template.instance().item !== undefined; },
  name() { return Template.instance().item.name; },
  description() { return Template.instance().item.description || '-'; },
  amount() { return this.item.amount; },
  thumbnail() { return Template.instance().item.thumbnail; },
});

Template.inventoryItem.events({
  'click .js-drop-item'(e) {
    e.preventDefault();
    e.stopPropagation();

    const positionInFrontOfPlayer = userManager.getPositionInFrontOfPlayer(userManager.player, dropItemDistance);
    Meteor.call('dropInventoryItem', Template.instance().data.item.itemId, positionInFrontOfPlayer);
  },
});

Template.inventory.onCreated(function () {
  this.inventory = new ReactiveVar([]);

  this.autorun(() => {
    const itemsIds = Object.keys(Meteor.user().inventory);
    if (!itemsIds?.length) return;

    this.subscribe('items', itemsIds, () => {
      const inventoryItems = Meteor.user().inventory || [];
      const itemIds = Object.keys(inventoryItems);
      this.inventory.set(itemIds.map(itemId => ({ itemId, amount: inventoryItems[itemId] })));
    });
  });
});

Template.inventory.helpers({
  items() { return Template.instance().inventory.get(); },
});