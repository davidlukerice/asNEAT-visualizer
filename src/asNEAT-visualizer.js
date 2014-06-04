
import Visualization from 'asNEAT/visualization';
import ForceVisualization from 'asNEAT/forceVisualization';
import OfflineSpectrogram from 'asNEAT/offlineSpectrogram';
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

Visualizer.createOfflineSpectrogram = function(parameters) {
  return new OfflineSpectrogram(parameters);
};

export default Visualizer;
