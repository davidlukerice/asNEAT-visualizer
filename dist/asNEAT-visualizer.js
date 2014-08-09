/* asNEAT-visualizer 0.3.0 2014-08-09 */
define("asNEAT/asNEAT-visualizer", 
  ["asNEAT/multiVisualization","asNEAT/networkVisualization","asNEAT/forceVisualization","asNEAT/offlineSpectrogram","asNEAT/liveSpectrogram","asNEAT/instrumentVisualization","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    
    var MultiVisualization = __dependency1__["default"];

    var NetworkVisualization = __dependency2__["default"];

    var ForceVisualization = __dependency3__["default"];

    var OfflineSpectrogram = __dependency4__["default"];

    var LiveSpectrogram = __dependency5__["default"];

    var InstrumentVisualization = __dependency6__["default"];

    var Visualizer = {};
    
    Visualizer.createInstrumentVisualization = function(parameters) {
        return new InstrumentVisualization(parameters);
    };
    
    Visualizer.createMultiVisualization = function(parameters) {
    
      // TODO: Create other visualizations and pass them in
      var visualizations = [];
      visualizations.push(Visualizer.createLiveSpectrogram(parameters));
      visualizations.push(Visualizer.createForceVisualization(parameters));
      parameters.visualizations = visualizations;
    
      return new MultiVisualization(parameters);
    };
    
    Visualizer.createNetworkVisualization = function(parameters) {
      return new NetworkVisualization(parameters);
    };
    
    Visualizer.createForceVisualization = function(parameters) {
      return new ForceVisualization(parameters);
    };
    
    Visualizer.createOfflineSpectrogram = function(parameters) {
    	return new OfflineSpectrogram(parameters);
    };
    
    Visualizer.createLiveSpectrogram = function(parameters) {
      return new LiveSpectrogram(parameters);
    };
    
    __exports__["default"] = Visualizer;
  });
define("asNEAT/forceVisualization", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var OscillatorNode = require('asNEAT/nodes/oscillatorNode')['default'],
        NoteOscillatorNode = require('asNEAT/nodes/noteOscillatorNode')['default'],
        OutNode = require('asNEAT/nodes/outNode')['default'],
        VNode = require('asNEAT/vNode')['default'],
        VConnection = require('asNEAT/vConnection')['default'],
        Graph = require('asNEAT/graph')['default'];
    
    var ForceVisualization = function(parameters) {
      _.defaults(this, parameters, this.defaultParameters);
    };
    ForceVisualization.prototype.defaultParameters = {
      network: null,
      // (num) for px, or (string) for %
      width: "100%",
      height: 600,
      selector: '.forceNetwork',
      animateSpeed: 750
    };
    
    ForceVisualization.prototype.init = function() {
      this.vNodes = [];
      this.vConnections = [];
      this.forceLayout = null;
    };
    
    ForceVisualization.prototype.start = function() {
      var self = this;
    
      var svg = d3.select(this.selector)
        .append('svg')
          .attr('width', this.width)
          .attr('height', this.height)
          .attr('pointer-events', 'all');
      
      // Have the back group watch for zoom events and move the forward group.
      // This fixes the issue of dragging a node also call the zoom events
      var backG = svg.append('g')
          .call(d3.behavior.zoom().on('zoom', function() {
            frontG.attr("transform",
              "translate(" + d3.event.translate + ")" +
              " scale(" + d3.event.scale + ")"); 
          }));
    
      var frontG = svg.append('g');
    
      backG.append('rect')
        .attr('class', 'draggableRect')
        .attr('fill', 'rgba(1,1,1,0)');
    
      frontG.append('g').attr('class', 'connections');
      frontG.append('g').attr('class', 'labels');
      frontG.append('g').attr('class', 'nodes');
    
      frontG.append('foreignObject')
        .attr('class', 'parameterToolTip')
        .attr("width", 240)
        .attr("height", 500)
        .append("xhtml:body")
          .style({
            'display': 'none',
            'font': "14px 'Helvetica Neue'",
            'border-radius': '5px',
            'background': 'rgba(180, 180, 180, 0.9)',
            'margin': '10px',
            'padding': '5px'
          });
    
      this.svg = svg;
      this.g = frontG;
    
      var color = {enabled:'black', disabled:'gray'};
      var defs = frontG.append("defs");
    
      defs.selectAll("marker")
        .data(["enabled", "disabled"])
      .enter().append("marker")
        .attr("id", function(d) { return d; })
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 3)
        .attr("markerHeight", 3)
        .attr("orient", "auto")
      .append("path")
        .attr("d", "M0,-5L10,0L0,5");
    
      // Create a highlight filter that creates an
      // orangish shadow under the element
      var hFilter = defs.append('filter')
        .attr('id', 'highlight')
        .attr('height', '200%')
        .attr('width', '200%')
        .attr('x', "-50%").attr('y', "-50%");
      // Create the drop shadow's blur
      hFilter.append('feGaussianBlur')
        .attr('in', 'SourceAlpha')
        .attr("stdDeviation", 2)
        .attr('result', 'blur');
      // Force to a specific color
      hFilter.append('feColorMatrix')
        .attr('in', 'blur')
        .attr('type', 'matrix')
        // [[a1 b2 c3 d4]...[a5 b5 c5 d5]] * [r g b a 1]
        // so if only using [d] it forces to that color
        // and mult a by 4 for a bolder highlight
        .attr('values', '0 0 0 0 1  0 0 0 0 0.522  0 0 0 0 0.106  0 0 0 4 0')
        .attr('result', 'coloredBlur');
      // Merge the original svg element and the new highlight blur
      var merge = hFilter.append('feMerge');
      merge.append('feMergeNode')
        .attr('in', 'coloredBlur');
      merge.append('feMergeNode')
        .attr('in', 'SourceGraphic');
    
      this.startForceLayout();
      this.refresh();
    
      this.onResize = function() {
        self.refresh();
      };
      $(window).on('resize', this.onResize);
    };
    ForceVisualization.prototype.stop = function() {
      $(window).off('resize', this.onResize);
      $(this.selector + " svg").remove();
      this.forceLayout.alpha(0);
    };
    
    /*
      creates a representation of each node/connection in the network to be shown
     **/
    ForceVisualization.prototype.updateVisualizationNetwork = function() {
      
      var nodes = this.vNodes,
          connections = this.vConnections;
    
      _.forEach(this.network.nodes, function(node) {
        var vNode = _.find(nodes, {'asNEATNode': node});
        if (vNode) return;
        nodes.push(VNode.createVNodeFrom(node));
      });
    
      _.forEach(this.network.connections, function(connection) {
        var conn = _.find(connections, {'asNEATConnection': connection});
        if (conn) return;
    
        // find the in/out nodes
        var inIndex = _.findIndex(nodes, {'asNEATNode': connection.sourceNode}),
            sourceNode = nodes[inIndex],
            outIndex = _.findIndex(nodes, {'asNEATNode': connection.targetNode}),
            targetNode = nodes[outIndex];
        connections.push(new VConnection({
          source: sourceNode,
          target: targetNode,
          asNEATConnection: connection
        }));
      });
    };
    
    ForceVisualization.prototype.getRect = function() {
      return this.svg[0][0].getClientRects()[0];
    };
    
    ForceVisualization.prototype.startForceLayout = function() {
      var svg = this.svg,
          vNodes = this.vNodes,
          vConnections = this.vConnections,
          rect = this.getRect(),
          width = rect.width,
          height = rect.height;
    
      this.forceLayout = d3.layout.force()
        .gravity(0.05)
        .friction(0.9)
        .charge(-200)
        .linkDistance(90)
        .linkStrength(function(link) {
          return link.asNEATConnection.enabled;
        })
        .size([width, height]);
    
      this.forceLayout
        .nodes(vNodes)
        .links(vConnections)
        .start();
    
      this.forceLayout.on("tick", function() {
        svg.select('.connections').selectAll('.connection')
          .attr('d', function(d) {
            return 'M'+d.source.x+' '+d.source.y+' '+d.target.x+' '+d.target.y;
          });
    
        var nodes = svg.select('.nodes').selectAll('.node')
          .attr("cx", function(d) {
            return d.x;
          })
          .attr("cy", function(d) {
            return d.y;
          });
    
        svg.select('.labels').selectAll('.label')
          .attr("x", function(d, i) {
            return nodes[0][i].cx.baseVal.value;
          })
          .attr("y", function(d, i) {
            return nodes[0][i].cy.baseVal.value-14;
          });
      });
    };
    
    ForceVisualization.prototype.refresh = function() {
      var vNodes = this.vNodes,
          vConnections = this.vConnections,
          animateSpeed = this.animateSpeed,
          rect = this.getRect();
    
      this.updateVisualizationNetwork();
    
      this.svg.select('.draggableRect')
        .attr('width', rect.width)
        .attr('height', rect.height);
    
      function getNodeColor(e) {
        if (e.asNEATNode instanceof OscillatorNode ||
            e.asNEATNode instanceof NoteOscillatorNode)
          return "#28b62c";
        if (e.asNEATNode instanceof OutNode)
          return "#222";
        return "#158cba";
      }
      function getNodeStrokeColor(e) {
        if (e.asNEATNode instanceof OscillatorNode ||
            e.asNEATNode instanceof NoteOscillatorNode)
          return "#23a127";
        if (e.asNEATNode instanceof OutNode)
          return "#111";
        return "#127ba3";
      }
    
      function getConnectionColor(e) {
        if (e.asNEATConnection.enabled)
          return '#111';
        else
          return '#aaa';
      }
    
      function getNodeId(e) {
        return e.asNEATNode.id;
      }
      function getConnectionId(e) {
        return e.asNEATConnection.id;
      }
    
      function getDashArray(conn) {
        return conn.asNEATConnection.enabled ?
          "" : "5,5";
      }
    
      function getMarker(conn) {
        return "url(#"+
          (conn.asNEATConnection.enabled ? "enabled" : "disabled")+
          ")";
      }
    
      function getNodeFilter(node) {
        return node.asNEATNode.hasChanged ?
          "url(#highlight)" : "";
      }
      function getConnectionFilter(conn) {
        return conn.asNEATConnection.hasChanged ?
          "url(#highlight)" : "";
      }
    
      var forceLayout = this.forceLayout;
      forceLayout.size([rect.width, rect.height]);
      forceLayout.start();
    
      var connections = this.svg.select('.connections').selectAll('.connection')
        .data(vConnections, getConnectionId);
      
      connections.enter().append("path")
        .attr('class', "connection")
        .style('stroke', getConnectionColor)
        .style('stroke-dasharray', getDashArray)
        .attr("marker-end", getMarker)
        .attr('filter', getConnectionFilter)
        .on("mouseover", function(d, i){
          parameterToolTip
            .attr('x', (d.target.x+d.source.x)/2)
            .attr('y', (d.target.y+d.source.y)/2);
          var html = buildParameterHtml(d.asNEATConnection.getParameters());
          parameterToolTipHtml
            .html(html)
            .style("display", "inline-block");
        })
        .on("mouseout", function(d) {
          parameterToolTipHtml
            .html('')
            .style("display", "none");
        });
    
      connections.transition()
        .duration(animateSpeed)
        .style('stroke', getConnectionColor)
        .style('stroke-dasharray', getDashArray)
        .attr("marker-end", getMarker)
        .attr('filter', getConnectionFilter);
    
      var parameterToolTip = this.svg.select('.parameterToolTip');
      var parameterToolTipHtml = parameterToolTip.select('body');
    
      var color = d3.scale.category20();
      var node = this.svg.select('.nodes').selectAll('.node')
        .data(vNodes, getNodeId);
    
      node.enter().append("circle")
        .attr("class", "node")
        .attr("r", 10)
        .attr('fill', getNodeColor)
        .attr('stroke', getNodeStrokeColor)
        .attr('filter', getNodeFilter)
        .call(forceLayout.drag)
        .on("mouseover", function(d, i){
          parameterToolTip
            .attr('x', d.x)
            .attr('y', d.y);
          var html = buildParameterHtml(d.asNEATNode.getParameters());
          parameterToolTipHtml
            .html(html)
            .style("display", "inline-block");
        })
        .on("mouseout", function(d) {
          parameterToolTipHtml
            .html('')
            .style("display", "none");
        });
      node.transition()
        .duration(animateSpeed)
        .attr('filter', getNodeFilter);
    
      var labels = this.svg.select('.labels').selectAll('.label')
        .data(vNodes, getNodeId)
        .enter().append('text')
          .attr('class', "label")
          .text(function(d, i) {
            return getCapitals(vNodes[i].asNEATNode.name);
          });
    };
    
    function buildParameterHtml(parameters) {
      return "<div>" +
        "<b>"+parameters.name+"</b> ("+parameters.id+")<br>"+
        _.reduce(parameters, function(result, value, key) {
          if (key==="name" || key==="id")
            return result;
          return result+key+": "+
            (_.isNumber(value) ?
              (!isInteger(value) ?
                value.toFixed(3) :
                value) :
              value ) +
            "<br>";
        }, "") +
        "</div>";
    }
    
    function isInteger(x) {
      /*jshint -W018 */
      return +x === x && !(x % 1);
    }
    
    function getCapitals(str) {
      return str.replace(/[a-z]/g, '');
    }
    
    __exports__["default"] = ForceVisualization;
  });
define("asNEAT/graph", 
  ["exports"],
  function(__exports__) {
    "use strict";
    
    var OutNode = require('asNEAT/nodes/outNode')['default'],
        log = require('asNEAT/utils')['default'].log;
    
    
    var Graph = function(parameters) {};
    
    Graph.longestPath = function(vNodes, vConns) {
    
      // Clear any data from the last longest path search
      _.forEach(vNodes, function(vNode) {
        vNode.cleanParameters();
      });
    
      // Start at the output node
      var outNode = _.find(vNodes, function(e) {
        return e.asNEATNode instanceof OutNode;
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
    
        var source = conn.source;
        var target = conn.target;
    
        if (source.longestPath) {
          log('todo collision');
        }
        else {
          var path = target.longestPath;
          
          // check outNode is the last node in path
          // if not, duplicate path from outNode
          if (!path.isLastNode(target))
            path = path.duplicateFromNode(outNode);
    
          path.pushNode(source);
          source.numHops = path.getLength();
          source.longestPath = path;
        }
    
        // push on next connections
        stack = _.union(stack, Graph.getConnectionsGoingTo(source, vConns));
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
    
    Graph.getConnectionsGoingTo = function(target, vConnections) {
      return _.filter(vConnections, function(e) {
        return e.asNEATConnection.enabled && e.target === target;
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
      newPath.nodes = this.nodes.slice(0, index+1);
      return newPath;
    };
    
    __exports__["default"] = Graph;
  });
define("asNEAT/instrumentVisualization", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var asNEAT = require('asNEAT/asNEAT')['default'],
        ForceVisualization = require('asNEAT/forceVisualization')['default'],
        context = asNEAT.context;
    
    // TODO: Clean this up... it's so bad :'(
    
    var scriptNodes = {};
    var keep = (function() {
      var nextNodeID = 1;
      return function(node) {
        node.id = node.id || (nextNodeID++);
        scriptNodes[node.id] = node;
        return node;
      };
    }());
    var drop = function(node) {
      delete scriptNodes[node.id];
      return node;
    };
    
    var InstrumentVisualization = function(parameters) {
      _.defaults(this, parameters, this.defaultParameters);
    };
    InstrumentVisualization.prototype.defaultParameters = {
      network: null,
      // (num) for px, or (string) for %
      width: "100%",
      height: 512,
      selector: '.instrumentVisualization',
    
      // the colors used in the vis
      colorScaleColors: ['#000000', '#ff0000', '#ffff00', '#ffffff'],
      colorScalePositions: [0, 0.25, 0.75, 1],
    
      blankStepsUntilPause: 50
    };
    
    var id = 0;
    InstrumentVisualization.prototype.init = function() {
      var canvas = document.createElement('canvas'),
          ctx = canvas.getContext('2d'),
          tempCanvas = document.createElement('canvas'),
          tempCtx = tempCanvas.getContext('2d'),
          networkDiv = document.createElement('div');
      this.canvas = canvas;
      this.ctx = ctx;
      this.tempCanvas = tempCanvas;
      this.tempCtx = tempCtx;
      this.networkDiv = networkDiv;
    
      this.$canvas = $(canvas);
      this.$tempCanvas = $(tempCanvas);
      this.networkDivClass = 'network'+(++id);
      $(this.selector)
        .addClass('asNEATInstrumentVis');
      this.$networkDiv = $(networkDiv)
        .addClass(this.networkDivClass)
        .addClass('asNEATInstrumentVisNetwork')
        .hide();
    
      this.colorScale = new chroma.scale(
        this.colorScaleColors,
        this.colorScalePositions);
      this.colorScale.domain([0, 300]);
    
      this.outNode = this.network.nodes[0];
    };
    
    InstrumentVisualization.prototype.start = function() {
      var self = this,
          canvas = this.canvas,
          ctx = this.ctx,
          tempCanvas = this.tempCanvas,
          tempCtx = this.tempCtx,
          outNode = this.outNode,
          jsNode, analyserNode;
    
      $(this.selector).append(this.$canvas);
      $(this.selector).append(this.$networkDiv);
    
      this.forceVis = new ForceVisualization({
        network: this.network,
        selector: "."+this.networkDivClass,
        width:'100%',
        height:'100%'
      });
      this.forceVis.init();
    
      this.$canvas.css({
        width: this.width,
        height: this.height
      });
      this.$tempCanvas.css({
        width: this.width,
        height: this.fftSize
      });
    
      var oldBounds = self.getBounds();
      this.fftSize = roundToPowerOf2(oldBounds.height);
      canvas.width = oldBounds.width;
      canvas.height = oldBounds.height;
      tempCanvas.width =  oldBounds.width;
      tempCanvas.height = this.fftSize/2;
      this.onResize = function() {
        var bounds = self.getBounds();
        tempCtx.drawImage(canvas,
          0, 0, canvas.width, canvas.height,
          0, 0, tempCanvas.width, tempCanvas.height);
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        oldBounds = bounds;
        clear();
        ctx.drawImage(tempCanvas,
          0, 0, tempCanvas.width, tempCanvas.height,
          0, 0, canvas.width, canvas.height);
        tempCanvas.width = bounds.width;
        tempCanvas.height = self.fftSize/2;
      };
      $(window).on('resize', this.onResize);
    
      function clear() {
        ctx.fillStyle=self.colorScale(0).hex();
        ctx.fillRect(0,0,oldBounds.width,oldBounds.height);
      }
      clear();
    
      jsNode = keep(context.createScriptProcessor(2048, 1, 1));
      jsNode.connect(context.destination);
      this.jsNode = jsNode;
    
      analyserNode = context.createAnalyser();
      analyserNode.smoothingTimeConstant = 0;
      analyserNode.fftSize = this.fftSize;
      this.analyserNode = analyserNode;
    
      // swap out outnode with custom one with
      var oldNode = outNode.node;
      var tempFrontGain = context.createGain();
      tempFrontGain.gain.value = 1.0;
    
      outNode.node = tempFrontGain;
      outNode.node.connect(analyserNode);
      analyserNode.connect(jsNode);
    
      var blankArray = new Uint8Array(analyserNode.frequencyBinCount),
          lastSum = 0,
          numRepeats = 0,
          numBlank = 0,
          blankStepsUntilPause = this.blankStepsUntilPause;
    
      jsNode.onaudioprocess = function() {
        var freqData = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(freqData);
    
        var sum = _.reduce(freqData, function(sum, val) {
          return sum + val;
        }, 0);
    
        // Send blank data if the same sum has been used more than twice
        // And don't even send anything after a set number of blanks
        if (sum===lastSum) {
          ++numRepeats;
          if (numRepeats >= 2) {
            ++numBlank;
            if (numBlank < blankStepsUntilPause)
              self.initUpdateCanvas(blankArray);
            else
              clearProcessing();
          }
          else {
            self.initUpdateCanvas(freqData);
            numBlank = 0;
          }
        }
        else {
          numRepeats = 0;
          numBlank = 0;
          self.initUpdateCanvas(freqData);
        }
    
        lastSum = sum;
      };
    
      function clearProcessing() {
        jsNode.onaudioprocess = null;
        drop(jsNode);
      }
    
      this.network.play();
      outNode.node = oldNode;
    
      this.playStart();
    };
    
    /**
      @param freqData {Uint8Array}
    */
    InstrumentVisualization.prototype.initCanvasX = 0;
    InstrumentVisualization.prototype.initUpdateCanvas = function(freqData) {
      // If the initial rendering runs into live updates, don't draw anything
      if (this.numUpdates + this.initCanvasX >= this.canvas.width)
        return;
    
      var tempCtx = this.tempCtx,
          colorScale = this.colorScale,
          tempCanvas = this.tempCanvas,
          i, len, val;
    
      for (i=0,len = freqData.length; i<len; ++i) {
        val = freqData[i];
        tempCtx.fillStyle = colorScale(val).hex();
        tempCtx.fillRect(this.initCanvasX, tempCanvas.height-i, 1, 1);
      }
      ++this.initCanvasX;
      copyFromTempCanvas.call(this);
    };
    
    InstrumentVisualization.prototype.playStart = function() {
      var self = this,
          canvas = this.canvas,
          ctx = this.ctx,
          tempCanvas = this.tempCanvas,
          tempCtx = this.tempCtx,
          outNode = this.outNode,
          jsNode, analyserNode;
    
      jsNode = keep(context.createScriptProcessor(2048, 1, 1));
      jsNode.connect(context.destination);
      this.jsNode = jsNode;
    
      analyserNode = context.createAnalyser();
      analyserNode.smoothingTimeConstant = 0;
      analyserNode.fftSize = this.fftSize;
      this.analyserNode = analyserNode;
    
      outNode.node.connect(analyserNode);
      analyserNode.connect(jsNode);
    
      var blankArray = new Uint8Array(analyserNode.frequencyBinCount),
          lastSum = 0,
          numAllowedRepeats = 2,
          blankStepsUntilPause = this.blankStepsUntilPause,
          numRepeats = blankStepsUntilPause,
          numBlank = blankStepsUntilPause;
    
      jsNode.onaudioprocess = function() {
    
        var freqData = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(freqData);
    
        var sum = _.reduce(freqData, function(sum, val) {
          return sum + val;
        }, 0);
    
        // go untill a set number of blank iterations then kill the jsNode
    
        if (sum === lastSum) {
          ++numRepeats;
          ++numBlank;
    
          if (numRepeats >= numAllowedRepeats) {
            if (numBlank < blankStepsUntilPause)
              self.updateCanvas(blankArray);
          }
          else {
            self.updateCanvas(freqData);
            numBlank = 0;
          }
        }
        else {
          numRepeats = 0;
          numBlank = 0;
          self.updateCanvas(freqData);
        }
    
        lastSum = sum;
      };
    };
    
    InstrumentVisualization.prototype.isShowingNetwork = false;
    InstrumentVisualization.prototype.showNetwork = function() {
      if(this.isShowingNetwork)
        return;
      this.isShowingNetwork = true;
      this.$networkDiv.show();
      this.forceVis.start();
    };
    InstrumentVisualization.prototype.hideNetwork = function() {
      if(!this.isShowingNetwork)
        return;
      this.isShowingNetwork = false;
      this.forceVis.stop();
      this.$networkDiv.hide();
    };
    
    InstrumentVisualization.prototype.stop = function() {
      this.$canvas.remove();
      $(window).off('resize', this.onResize);
      this.jsNode.disconnect(context.destination);
      this.analyserNode.disconnect(this.jsNode);
      drop(this.jsNode);
    };
    
    InstrumentVisualization.prototype.refresh = function() {
    
    };
    
    InstrumentVisualization.prototype.numUpdates = 0;
    /**
      @param freqData {Uint8Array}
    */
    InstrumentVisualization.prototype.updateCanvas = function(freqData) {
      var tempCtx = this.tempCtx,
          colorScale = this.colorScale,
          tempCanvas = this.tempCanvas,
          i, len, val;
    
      // shift the temp canvas left and draw in next section
      shiftTempCanvasLeft.call(this);
      for (i=0,len = freqData.length; i<len; ++i) {
        val = freqData[i];
        tempCtx.fillStyle = colorScale(val).hex();
        tempCtx.fillRect(tempCanvas.width-1, tempCanvas.height-i, 1, 1);
      }
    
      ++this.numUpdates;
      copyFromTempCanvas.call(this);
    };
    
    InstrumentVisualization.prototype.getBounds = function() {
      return this.canvas.getClientRects()[0];
    };
    
    function shiftTempCanvasLeft() {
      var tempCtx = this.tempCtx,
          imageData = tempCtx.getImageData(1, 0, tempCtx.canvas.width-1, tempCtx.canvas.height);
      tempCtx.putImageData(imageData, 0, 0);
    }
    
    function copyFromTempCanvas() {
      var canvas = this.canvas,
          tempCanvas = this.tempCanvas;
      // map temp canvas that with height=fftSize
      this.ctx.drawImage(tempCanvas,
        0, 0, tempCanvas.width, tempCanvas.height,
        0, 0, canvas.width, canvas.height);
    }
    
    function roundToPowerOf2(v) {
      v--;
      v|=v>>1;
      v|=v>>2;
      v|=v>>4;
      v|=v>>8;
      v|=v>>16;
      return ++v;
    }
    
    __exports__["default"] = InstrumentVisualization;
  });
define("asNEAT/liveSpectrogram", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var asNEAT = require('asNEAT/asNEAT')['default'],
        context = asNEAT.context;
    
    // Workaround for garbageCollected jsNodes
    // http://sriku.org/blog/2013/01/30/taming-the-scriptprocessornode/#replacing-gain-node-with-scriptprocessornode
    var scriptNodes = {};
    var keep = (function() {
      var nextNodeID = 1;
      return function(node) {
        node.id = node.id || (nextNodeID++);
        scriptNodes[node.id] = node;
        return node;
      };
    }());
    var drop = function(node) {
      delete scriptNodes[node.id];
      return node;
    };
    
    var LiveSpectrogram = function(parameters) {
      _.defaults(this, parameters, this.defaultParameters);
    };
    LiveSpectrogram.prototype.defaultParameters = {
      network: null,
      // (num) for px, or (string) for %
      width: "100%",
      height: 512,
      selector: '.liveSpectrogram',
    
      // number of frequency bands in the y direction
      // TODO: Update based on height*2?
      fftSize: 1024,
    
      // the colors used in the vis
      colorScaleColors: ['#000000', '#ff0000', '#ffff00', '#ffffff'],
      colorScalePositions: [0, 0.25, 0.75, 1]
    };
    
    LiveSpectrogram.prototype.init = function() {
      var canvas = document.createElement('canvas'),
          ctx = canvas.getContext('2d'),
          tempCanvas = document.createElement('canvas'),
          tempCtx = tempCanvas.getContext('2d');
      this.canvas = canvas;
      this.ctx = ctx;
      this.tempCanvas = tempCanvas;
      this.tempCtx = tempCtx;
    
      this.$canvas = $(canvas);
      this.$tempCanvas = $(tempCanvas);
    
      this.colorScale = new chroma.scale(
        this.colorScaleColors,
        this.colorScalePositions);
      this.colorScale.domain([0, 300]);
    
      this.outNode = this.network.nodes[0];
    };
    
    LiveSpectrogram.prototype.start = function() {
      var self = this,
          canvas = this.canvas,
          ctx = this.ctx,
          tempCanvas = this.tempCanvas,
          tempCtx = this.tempCtx,
          $canvas = this.$canvas,
          $tempCanvas = this.$tempCanvas,
          outNode = this.outNode,
          jsNode, analyserNode;
    
      jsNode = keep(context.createScriptProcessor(2048, 1, 1));
      jsNode.connect(context.destination);
      this.jsNode = jsNode;
    
      analyserNode = context.createAnalyser();
      analyserNode.smoothingTimeConstant = 0;
      analyserNode.fftSize = this.fftSize;
      this.analyserNode = analyserNode;
    
      outNode.node.connect(analyserNode);
      analyserNode.connect(jsNode);
    
      $(this.selector).append($canvas);
    
      $canvas.css({
        width: this.width,
        height: this.height
      });
      $tempCanvas.css({
        width: this.width,
        height: this.height
      });
    
      this.onResize = function() {
        // TODO: Scale/Copy old canvas into new resized one
        var bounds = self.getBounds();
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        tempCanvas.width = bounds.width;
        tempCanvas.height = bounds.height;
        clearCanvas();
      };
      $(window).on('resize', this.onResize);
      this.onResize();
    
      function clearCanvas() {
        var bounds = self.getBounds();
        ctx.fillStyle=self.colorScale(0).hex();
        ctx.fillRect(0,0,canvas.width,canvas.height);
      }
    
      var blankArray = new Uint8Array(analyserNode.frequencyBinCount),
          lastSum = 0,
          numRepeats = 0;
    
      jsNode.onaudioprocess = function() {
    
        var freqData = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteFrequencyData(freqData);
    
        var sum = _.reduce(freqData, function(sum, val) {
          return sum + val;
        }, 0);
    
        // Send blank data if the same sum has been used more than twice
        if (sum===lastSum) {
          ++numRepeats;
          if (numRepeats >= 2) {
            self.updateCanvas(blankArray);
          }
          else
            self.updateCanvas(freqData);
        }
        else {
          numRepeats = 0;
          self.updateCanvas(freqData);
        }
    
        lastSum = sum;
      };
    };
    
    LiveSpectrogram.prototype.stop = function() {
      this.$canvas.remove();
      $(window).off('resize', this.onResize);
      this.jsNode.disconnect(context.destination);
      this.analyserNode.disconnect(this.jsNode);
      drop(this.jsNode);
    };
    
    LiveSpectrogram.prototype.refresh = function() {
    
    };
    
    /**
      @param freqData {Uint8Array}
    */
    LiveSpectrogram.prototype.updateCanvas = function(freqData) {
      var canvas = this.canvas,
          tempCanvas = this.tempCanvas,
          tempCtx = this.tempCtx,
          ctx = this.ctx,
          colorScale = this.colorScale,
          bounds = this.getBounds(),
          i, len, val;
    
      // See if the canvas even exists
      if (typeof bounds === "undefined")
        return;
    
      tempCtx.drawImage(canvas, 0, 0, bounds.width, bounds.height);
      for (i=0,len = freqData.length; i<len; ++i) {
        val = freqData[i];
        ctx.fillStyle = colorScale(val).hex();
        ctx.fillRect(bounds.width-1, bounds.height-i, 1, 1);
      }
    
      ctx.translate(-1, 0);
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height,
                                0, 0, canvas.width, canvas.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    
    LiveSpectrogram.prototype.getBounds = function() {
      return this.canvas.getClientRects()[0];
    };
    
    __exports__["default"] = LiveSpectrogram;
  });
define("asNEAT/multiVisualization", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var asNEAT = require('asNEAT/asNEAT')['default'],
        context = asNEAT.context;
    
    var MultiVisualization = function(parameters) {
      _.defaults(this, parameters, this.defaultParameters);
      this.currentVisualization = this.visualizations[this.currentVisualizationIndex];
    };
    MultiVisualization.prototype.defaultParameters = {
      network: null,
      // (num) for px, or (string) for %
      width: "100%",
      height: "100%",
      selector: '.multiVisualization',
      visualizations: [],
      currentVisualizationIndex: 0
    };
    
    MultiVisualization.prototype.init = function() {
      var self = this;
      $(this.selector).css({
        width: this.width,
        height: this.height
      });
      _.forEach(this.visualizations, function(vis) {
        vis.width = self.width;
        vis.height = self.height;
        vis.selector = self.selector; 
        vis.init();
      });
    };
    
    MultiVisualization.prototype.start = function() {
      this.currentVisualization.start();
    };
    
    MultiVisualization.prototype.stop = function() {
      this.currentVisualization.stop();
    };
    
    MultiVisualization.prototype.refresh = function() {
      this.currentVisualization.refresh();
    };
    
    MultiVisualization.prototype.nextVisualization = function() {
      this.currentVisualization.stop();
      this.currentVisualizationIndex = (this.currentVisualizationIndex+1)%
                                          this.visualizations.length;
      this.currentVisualization = this.visualizations[this.currentVisualizationIndex];
      this.currentVisualization.start();
    };
    
    __exports__["default"] = MultiVisualization;
  });
define("asNEAT/networkVisualization", 
  ["exports"],
  function(__exports__) {
    "use strict";
    
    var OscillatorNode = require('asNEAT/nodes/oscillatorNode')['default'],
        NoteOscillatorNode = require('asNEAT/nodes/noteOscillatorNode')['default'],
        OutNode = require('asNEAT/nodes/outNode')['default'],
        VNode = require('asNEAT/vNode')['default'],
        VConnection = require('asNEAT/vConnection')['default'],
        Graph = require('asNEAT/graph')['default'];
    
    var NetworkVisualization = function(parameters) {
      _.defaults(this, parameters, this.defaultParameters);
    
      var svg = d3.select(this.selector).append('svg')
        .attr('width', this.width)
        .attr('height', this.height);
      svg.append('g').attr('class', 'connections');
      svg.append('g').attr('class', 'nodes');
      svg.append('g').attr('class', 'labels');
      this.svg = svg;
    
      this.vNodes = [];
      this.vConnections = [];
    
      this.refresh();
    
      var self = this,
          oldResize = window.onresize;
      window.onresize = function() {
        self.refresh();
        if (oldResize)
          oldResize();
      };
    };
    NetworkVisualization.prototype.defaultParameters = {
      network: null,
      // (num) for px, or (string) for %
      width: "100%",
      height: 600,
      // (num) for px
      padding: 60,
      selector: '.network',
      animateSpeed: 750
    };
    
    /*
      creates a representation of each node/connection in the network to be shown
     **/
    NetworkVisualization.prototype.updateVisualizationNetwork = function() {
      
      var nodes = this.vNodes,
          connections = this.vConnections;
    
      _.forEach(this.network.nodes, function(node) {
        var vNode = _.find(nodes, {'asNEATNode': node});
        if (vNode) return;
        nodes.push(VNode.createVNodeFrom(node));
      });
    
      _.forEach(this.network.connections, function(connection) {
        var conn = _.find(connections, {'asNEATConnection': connection});
        if (conn) return;
    
        // find the in/out nodes
        var source = _.find(nodes, {'asNEATNode': connection.sourceNode}),
            target = _.find(nodes, {'asNEATNode': connection.targetNode});
        connections.push(new VConnection({
          source: source,
          target: target,
          asNEATConnection: connection
        }));
      });
    
      Graph.longestPath(nodes, connections);
    };
    
    NetworkVisualization.prototype.refresh = function() {
      var vNodes = this.vNodes,
          vConnections = this.vConnections,
          rects = this.svg[0][0].getClientRects()[0],
          width = rects.width,
          height = rects.height,
          padding = this.padding,
          animateSpeed = this.animateSpeed;
    
      this.updateVisualizationNetwork();
    
      function getX(e,i) {
        return e.getLocalX()*(width-2*padding) + padding;
      }
      function getY(e,i) {
        return e.getLocalY()*(height-2*padding) + padding;
      }
    
      var diff = 200;
      function getInitialD(e,i) {
        var x1 = getX1(e),
            y1 = getY1(e);
        return 'M'+x1+','+y1+' C'+x1+
               ','+y1+' '+x1+','+y1+
               ' '+x1+','+y1;
      }
      function getD(e,i) {
        var x1 = getX1(e),
            y1 = getY1(e),
            x2 = getX2(e),
            y2 = getY2(e);
        return 'M'+x1+','+y1+' C'+(x1+diff)+
               ','+y1+' '+(x2-diff)+','+y2+
               ' '+x2+','+y2;
      }
      function getX1(e) {
        return getX(e.source);
      }
      function getY1(e) {
        return getY(e.source);
      }
      function getX2(e) {
        return getX(e.target);
      }
      function getY2(e) {
        return getY(e.target);
      }
    
      function getNodeColor(e) {
        if (e.asNEATNode instanceof OscillatorNode ||
            e.asNEATNode instanceof NoteOscillatorNode)
          return "green";
        if (e.asNEATNode instanceof OutNode)
          return "black";
        return "red";
      }
    
      function getConnectionColor(e) {
        if (e.asNEATConnection.enabled)
          return 'black';
        else
          return 'gray';
      }
    
      function getConnectionId(e) {
        return e.asNEATConnection.id;
      }
    
      var dNodes = this.svg
        .select('.nodes')
        .selectAll('.node')
        .data(vNodes);
    
      dNodes.transition()
        .duration(animateSpeed)
        .attr('cx', getX)
        .attr('cy', getY)
        .attr('r', 10);
    
      dNodes.enter().append('circle')
        .attr('class', 'node')
        .attr('cx', getX)
        .attr('cy', getY)
        .attr('r', 0)
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .attr('fill', getNodeColor)
        .transition()
          .duration(animateSpeed)
          .attr('r', 10);
    
      // Render connections
      var dConnections = this.svg
          .select('.connections')
          .selectAll('.connection')
          .data(vConnections, getConnectionId);
    
      dConnections.transition()
        .duration(animateSpeed)
        .attr('d', getD)
        .style('stroke', getConnectionColor);
    
      dConnections.enter().append('path')
        .attr('class', 'connection')
        .attr('d', getInitialD)
        .attr('fill', 'none')
        .style('stroke', getConnectionColor)
        .style('stroke-width', 2)
        .transition()
          .duration(animateSpeed)
          .attr('d', getD);
    
      var dInfo = this.svg
          .select('.labels')
          .selectAll('.label')
          .data(vNodes);
      dInfo.transition()
        .duration(animateSpeed)
        .attr('x', getX)
        .attr('y', getY)
        .text(function(e){return e.getLabel();});
      dInfo.enter().append('text')
        .attr('class', 'label')
        .attr('x', getX)
        .attr('y', getY)
        .style('fill', 'red')
        .text(function(e){return e.getLabel();});
    
    };
    
    __exports__["default"] = NetworkVisualization;
  });
define("asNEAT/offlineSpectrogram", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var asNEAT = require('asNEAT/asNEAT')['default'];
    
    // Workaround for garbageCollected jsNodes
    // http://sriku.org/blog/2013/01/30/taming-the-scriptprocessornode/#replacing-gain-node-with-scriptprocessornode
    var scriptNodes = {};
    var keep = (function() {
      var nextNodeID = 1;
      return function(node) {
        node.id = node.id || (nextNodeID++);
        scriptNodes[node.id] = node;
        return node;
      };
    }());
    var drop = function(node) {
      delete scriptNodes[node.id];
      return node;
    };
    
    var OfflineSpectrogram = function(parameters) {
      _.defaults(this, parameters, this.defaultParameters);
    };
    OfflineSpectrogram.prototype.defaultParameters = {
      network: null,
      // (num) for px, or (string) for %
      width: "100%",
      height: 512,
      selector: '.offlineSpectrogram',
    
      // number of frequency bands in the y direction
      // TODO: Update based on height*2?
      fftSize: 1024,
    
      // the colors used in the vis
      colorScaleColors: ['#000000', '#ff0000', '#ffff00', '#ffffff'],
      colorScalePositions: [0, 0.25, 0.75, 1]
    };
    
    OfflineSpectrogram.prototype.init = function() {
      var canvas = document.createElement('canvas'),
          ctx = canvas.getContext('2d'),
          tempCanvas = document.createElement('canvas'),
          tempCtx = tempCanvas.getContext('2d');
      this.canvas = canvas;
      this.ctx = ctx;
      this.tempCanvas = tempCanvas;
      this.tempCtx = tempCtx;
    
      this.$canvas = $(canvas);
      this.$tempCanvas = $(tempCanvas);
    
      this.colorScale = new chroma.scale(
        this.colorScaleColors,
        this.colorScalePositions);
      this.colorScale.domain([0, 300]);
    
      this.outNode = this.network.nodes[0];
    };
    
    OfflineSpectrogram.prototype.start = function() {
      var self = this,
          canvas = this.canvas,
          ctx = this.ctx,
          tempCanvas = this.tempCanvas,
          tempCtx = this.tempCtx,
          $canvas = this.$canvas,
          $tempCanvas = this.$tempCanvas,
          outNode = this.outNode,
          jsNode, analyserNode;
    
      $(this.selector).append($canvas);
    
      $canvas.css({
        width: this.width,
        height: this.height
      });
      $tempCanvas.css({
        width: this.width,
        height: this.height
      });
    
      this.onResize = function() {
        // TODO: Scale/Copy old canvas into new resized one
        var bounds = self.getBounds();
        canvas.width = bounds.width;
        canvas.height = bounds.height;
        tempCanvas.width = bounds.width;
        tempCanvas.height = bounds.height;
        clearCanvas();
      };
      $(window).on('resize', this.onResize);
      this.onResize();
    
      function clearCanvas() {
        var bounds = self.getBounds();
        ctx.fillStyle=self.colorScale(0).hex();
        ctx.fillRect(0,0,bounds.width,bounds.height);
      }
    
      var afterPrepHandler = function(contextPair) {
        var context = contextPair.context;
        self.context = context;
    
        jsNode = keep(context.createScriptProcessor(2048, 1, 1));
        jsNode.connect(context.destination);
        self.jsNode = jsNode;
    
        analyserNode = context.createAnalyser();
        analyserNode.smoothingTimeConstant = 0;
        analyserNode.fftSize = self.fftSize;
        self.analyserNode = analyserNode;
    
        outNode.offlineNode.connect(analyserNode);
        analyserNode.connect(jsNode);
    
        var blankArray = new Uint8Array(analyserNode.frequencyBinCount),
          lastSum = 0,
          numRepeats = 0;
    
        jsNode.onaudioprocess = function() {
    
        var freqData = new Uint8Array(analyserNode.frequencyBinCount);
          analyserNode.getByteFrequencyData(freqData);
    
          var sum = _.reduce(freqData, function(sum, val) {
            return sum + val;
          }, 0);
    
          // Send blank data if the same sum has been used more than twice
          if (sum===lastSum) {
            ++numRepeats;
            if (numRepeats >= 2) {
              self.updateCanvas(blankArray);
            }
            else
              self.updateCanvas(freqData);
          }
          else {
            numRepeats = 0;
            self.updateCanvas(freqData);
          }
    
          lastSum = sum;
        };
      };
    
      this.network.offlinePlay(function done() {
        console.log('doneRendering');
      }, afterPrepHandler);
    };
    
    OfflineSpectrogram.prototype.stop = function() {
      this.$canvas.remove();
      $(window).off('resize', this.onResize);
      this.jsNode.disconnect(this.context.destination);
      this.analyserNode.disconnect(this.jsNode);
      drop(this.jsNode);
    };
    
    OfflineSpectrogram.prototype.refresh = function() {
    
    };
    
    /**
      @param freqData {Uint8Array}
    */
    OfflineSpectrogram.prototype.updateCanvas = function(freqData) {
      var canvas = this.canvas,
          tempCanvas = this.tempCanvas,
          tempCtx = this.tempCtx,
          ctx = this.ctx,
          colorScale = this.colorScale,
          bounds = this.getBounds(),
          i, len, val;
    
      // See if the canvas even exists
      if (typeof bounds === "undefined")
        return;
    
      tempCtx.drawImage(canvas, 0, 0, bounds.width, bounds.height);
      for (i=0,len = freqData.length; i<len; ++i) {
        val = freqData[i];
        ctx.fillStyle = colorScale(val).hex();
        ctx.fillRect(bounds.width-1, bounds.height-i, 1, 1);
      }
    
      ctx.translate(-1, 0);
      ctx.drawImage(tempCanvas, 0, 0, bounds.width, bounds.height,
                                0, 0, bounds.width, bounds.height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };
    
    OfflineSpectrogram.prototype.getBounds = function() {
      return this.canvas.getClientRects()[0];
    };
    
    __exports__["default"] = OfflineSpectrogram;
  });
define("asNEAT/vConnection", 
  ["exports"],
  function(__exports__) {
    "use strict";
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
    
    __exports__["default"] = VConnection;
  });
define("asNEAT/vNode", 
  ["exports"],
  function(__exports__) {
    "use strict";
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
    
    __exports__["default"] = VNode;
  });
//# sourceMappingURL=asNEAT-visualizer.js.map