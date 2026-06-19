const EventEmitter = require('events');

/**
 * Enterprise Decoupled EventBus
 * Utilizes Node's native high-performance EventEmitter. Can be easily swapped
 * with a Redis-backed Pub/Sub mechanism when scaling across physical container boundaries.
 */
class EventBus extends EventEmitter {
  constructor() {
    super();
    this.logger = console;
  }

  /**
   * Emits an event onto the bus with an associated payload
   * @param {string} eventName 
   * @param {object} payload 
   */
  publish(eventName, payload) {
    this.logger.log(`[EventBus] 📢 Publish topic "${eventName}":`, JSON.stringify(payload, null, 2));
    this.emit(eventName, payload);
  }

  /**
   * Registers a subscriber for a specific event topic
   * @param {string} eventName 
   * @param {function} handler 
   */
  subscribe(eventName, handler) {
    this.logger.log(`[EventBus] 📥 Subscribed to topic "${eventName}"`);
    this.on(eventName, handler);
  }
}

const eventBus = new EventBus();
module.exports = eventBus;
