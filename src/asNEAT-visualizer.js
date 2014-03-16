
import Visualization from 'asNEAT/visualization';

var Visualizer = {};

/*
  @param network {asNEAT.Network}
*/
Visualizer.createVisualization = function(defaultParameters) {
  return new Visualization(defaultParameters);
};

export default Visualizer;
