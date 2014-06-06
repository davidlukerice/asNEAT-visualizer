
import Visualization from 'asNEAT/visualization';
import ForceVisualization from 'asNEAT/forceVisualization';
import LiveSpectrogram from 'asNEAT/liveSpectrogram';
var Visualizer = {};

/*
  @param network {asNEAT.Network}
*/
Visualizer.createVisualization = function(parameters) {
  return new Visualization(parameters);
};

Visualizer.createForceVisualization = function(parameters) {
  return new ForceVisualization(parameters);
};

Visualizer.createLiveSpectrogram = function(parameters) {
  return new LiveSpectrogram(parameters);
};

export default Visualizer;
