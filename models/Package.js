class Package {
    constructor(id, userName, pickupLocation, destination, estimatedDeliveryTime, estimatedPrice, deliverTo, createdOn, lat, lng) {
      this.id = id;
      this.userName = userName;
      this.pickupLocation = pickupLocation;
      this.destination = destination;
      this.estimatedDeliveryTime = estimatedDeliveryTime;
      this.estimatedPrice = estimatedPrice;
      this.deliverTo = deliverTo;
      this.createdOn = createdOn;
      this.lat = lat; // Latitude
      this.lng = lng; // Longitude
    }
  }
  
  module.exports = Package;
  