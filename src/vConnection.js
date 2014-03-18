var VConnection = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
};
VConnection.prototype.defaultParameters = {
  inVNode: null,
  outVNode: null,
  asNEATConnection: null
};

export default VConnection;