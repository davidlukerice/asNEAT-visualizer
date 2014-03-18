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
VNode.prototype.getLongestPathLength = function() {
  return this.longestPath ? this.longestPath.getLength() : 1;
};
VNode.prototype.getNumberNodesInHash = function() {
  return this.hashElement ? this.hashElement.value : 1;
};
VNode.prototype.getLocalX = function() {
  return (1-this.numHops/this.getLongestPathLength());
};
VNode.prototype.getLocalY = function() {
  return (this.yIndex+1)/(this.getNumberNodesInHash()+1);
};
VNode.prototype.getLabel = function() {
  return '('+this.numHops+"/"+this.getLongestPathLength()+
        ', '+this.yIndex+'/'+this.getNumberNodesInHash()+')';
};

VNode.createVNodeFrom = function(asNEATNode) {
  return new VNode({
    asNEATNode: asNEATNode
  });
};

export default VNode;