var asNEAT = require('asNEAT/asNEAT')['default'],
    context = asNEAT.context;

var MultiVisualizer = function(parameters) {
  _.defaults(this, parameters, this.defaultParameters);
  var self = this;
};
MultiVisualizer.prototype.defaultParameters = {
  network: null,
  // (num) for px, or (string) for %
  width: "100%",
  height: 512,
  selector: '.MultiVisualizer'
};

MultiVisualizer.prototype.refresh = function() {

};

export default MultiVisualizer;
