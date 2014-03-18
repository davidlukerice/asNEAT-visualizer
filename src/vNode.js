var VNode = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
};
VNode.prototype.defaultParameters = {
  numHops: 0,
  longestPath: null,
  yIndex: 0,
  hashElement: null,
  asNEATNode: null
};
VNode.prototype.cleanParameters = function() {
  this.numHops = 0;
  this.longestPath = null;
  this.yIndex = 0;
  this.hashElement = null;
};
VNode.prototype.getLocalX = function() {
  var longestPathLength = this.longestPath ?
        this.longestPath.getLength() : 1;
  return (1-this.numHops/longestPathLength);
};
VNode.prototype.getLocalY = function() {
  var hashNum = this.hashElement ?
        this.hashElement.value : 1;
  return (this.yIndex+1)/(hashNum+1);
};
VNode.prototype.getPosString = function() {
  var longestPathLength = this.longestPath ? this.longestPath.getLength() : 1;
  return this.numHops+"/"+longestPathLength;
};

var inc = 0;
VNode.createVNodeFrom = function(asNEATNode) {
  return new VNode({
    asNEATNode: asNEATNode//,
    
    // todo remove defaults after longestPath is working
    //numHops: inc++,
    //longestPath: {length: 4, path:[]},
    //yIndex: 0,
    //hashElement: {value: 1}
  });
};

export default VNode;