var VConnection = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
};
VConnection.prototype.defaultParameters = {
  inVNode: null,
  outVNode: null,
  
  //indexes in the nodes array
  source: 0,
  target: 1,

  asNEATConnection: null
};

export default VConnection;