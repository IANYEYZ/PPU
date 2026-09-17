export class DeckManager {
  constructor(engine) { this.engine = engine; }
  get state() { return this.engine.state; }
  remove(id) {
    for (const zone of ['hand','draw','discard','exhaust','powers','resolving']) {
      const index = this.state[zone].findIndex(c => c.id === id);
      if (index >= 0) return this.state[zone].splice(index, 1)[0];
    }
    return null;
  }
  draw(amount) {
    const drawn = [];
    if (this.state.drawLocked) return drawn;
    for (let i = 0; i < amount; i++) {
      if (this.state.hand.length >= 12) break;
      if (!this.state.draw.length) { this.state.draw = this.engine.rng.shuffle(this.state.discard); this.state.discard = []; if (this.state.draw.length) this.engine.bus.emit('deck:shuffled', { count: this.state.draw.length }); }
      const card = this.state.draw.pop(); if (!card) break;
      this.state.hand.push(card); drawn.push(card.id); this.engine.bus.emit('card:drawn', { cardId: card.id });
    }
    return drawn;
  }
  put(card, zone = 'hand', position = 'top') {
    if (zone === 'hand' && this.state.hand.length >= 12) zone = 'discard';
    if (zone === 'draw' && position === 'bottom') this.state.draw.unshift(card);
    else this.state[zone].push(card);
  }
  exhaust(card) { const removed = this.remove(card.id); if (!removed) return; this.state.exhaust.push(removed); this.engine.bus.emit('card:exhausted', { cardId: card.id }); }
  endTurn() {
    for (const card of [...this.state.hand]) {
      const keywords = this.engine.resolve(card).keywords;
      if (keywords.includes('Ethereal')) this.exhaust(card);
      else if (!keywords.includes('Retain') && !this.state.retainedIds.includes(card.id)) { this.remove(card.id); this.state.discard.push(card); }
    }
  }
  move(from, to, amount) {
    if (!['draw','discard','hand','exhaust'].includes(from) || !['draw','discard','hand','exhaust'].includes(to) || from === to) return;
    for (let i = 0; i < amount && this.state[from].length; i++) {
      const card = this.state[from].at(-1);
      if (to === 'exhaust') this.exhaust(card);
      else { this.state[from].pop(); this.state[to].push(card); }
    }
  }
}
