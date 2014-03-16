
var Visualizer = {};

/*
  @param network {asNEAT.Network}
*/
Visualizer.createVisualization = function(defaultParameters) {
  return new Visualizer.Visualization(defaultParameters);
};

var Visualization = function(defaultParameters) {
  _.defaults(this, defaultParameters, this.defaultParameters);
};
Visualization.prototype.defaultParameters = {
  network: null,
  width: 800,
  height: 600,
  padding: 0
};

Visualizer.Visualization = Visualization; 
export default Visualizer;
