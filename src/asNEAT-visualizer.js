
import Visualization from 'asNEAT/visualization';
import ForceVisualization from 'asNEAT/forceVisualization';
var Visualizer = {};

/*
  @param network {asNEAT.Network}
*/
Visualizer.createVisualization = function(parameters) {
  return new Visualization(parameters);
};

Visualizer.createForceVisualization = function(parameters) {
  return new ForceVisualization(parameters);
}

export default Visualizer;
