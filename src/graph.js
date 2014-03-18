
var Graph = function(parameters) {};

Graph.longestPath = function(vNodes, vConns) {
  var log = asNEAT.Utils.log;

  // Clear any data from the last longest path search
  _.forEach(vNodes, function(vNode) {
    vNode.cleanParameters();
  });

  // Start at the output node
  var outNode = _.find(vNodes, function(e) {
    return e.asNEATNode instanceof asNEAT.OutNode;
  });
  
  log('found outNode: '+ outNode.asNEATNode.toString());

  var stack = [];
  stack = _.union(stack, Graph.getConnectionsGoingTo(outNode, vConns));

  var paths = [];
  var firstPath = new Path(outNode);
  outNode.longestPath = firstPath;
  outNode.numHops = firstPath.getLength();
  paths.push(firstPath);

  // traverse backwards along "enabled" connections and mark #hops on longest route
  while (stack.length) {
    var conn = stack.pop();

    var inVNode = conn.inVNode;
    var outVNode = conn.outVNode;

    if (inVNode.longestPath) {
      log('todo collision');
    }
    else {
      var path = outVNode.longestPath;
      
      // check outNode is the last node in path
      // if not, duplicate path from outNode
      if (!path.isLastNode(outVNode))
        path = path.duplicateFromNode(outNode);

      path.pushNode(inVNode);
      inVNode.numHops = path.getLength();
      inVNode.longestPath = path;
    }

    // push on next connections
    stack = _.union(stack, Graph.getConnectionsGoingTo(inVNode, vConns));
  }

  // foreach node increment # in hash w/ key of x & assign (h[x]-1) as YIndex;
  var hash = {};
  _.forEach(vNodes, function(vNode) {
    var key = vNode.getLocalX(),
        entry = hash[key];
    if (!entry) {
      entry = { value: 0 };
      hash[key] = entry;
    }

    vNode.hashElement = entry;
    vNode.yIndex = entry.value++;
  });
};

Graph.getConnectionsGoingTo = function(vNode, vConnections) {
  return _.filter(vConnections, function(e) {
    return e.asNEATConnection.enabled && e.outVNode === vNode;
  });
};


var Path = function(vNode) {
  this.nodes = [];
  if (vNode)
    this.pushNode(vNode);
};
Path.prototype.pushNode = function(vNode) {
  this.nodes.push(vNode);
};
Path.prototype.inPath = function(vNode) {
  return !!_.find(this.nodes, {'asNEATNode': vNode.asNEATNode});
};
/*
  @return the number of connections in the path
*/
Path.prototype.getLength = function() {
  return this.nodes.length-1;
};
Path.prototype.isLastNode = function(vNode) {
  return this.nodes[this.nodes.length-1]===vNode;
};
Path.prototype.duplicateFromNode = function(vNode) {
  var index = _.findIndex(this.nodes, function(node) {
    return node.asNEATNode === vNode.asNEATNode;
  });

  var newPath = new Path();
  newPath.nodes = this.nodes.slice(0, index);
  return newPath;
};

export default Graph;
