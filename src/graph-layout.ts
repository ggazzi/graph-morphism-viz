import {Model} from './model';
import {Point, Vector} from './geometry';
import {Graph} from './graph';

export class GraphLayouter {
  private _config: GraphLayouter.Configuration;
  private _simulation: d3.Simulation<Graph.Node>

  get config(): GraphLayouter.Configuration { return this._config; }
  get simulation(): d3.Simulation<Graph.Node> { return this._simulation; }

  /** Increases the temperature and restarts the simulation if it isn't disabled. */
  restart(): GraphLayouter {
    if (this._config.get<boolean>('layouterOn')) {
      this._simulation.alpha(0.2).restart();
    }

    return this;
  }

  constructor(config: GraphLayouter.Configuration, graph: Graph, width: number, height: number) {
    this._config = config;

    function restartSim() { this.restart(); }
    const [gravityX, gravityY] = makeGravity(config, width, height, restartSim);
    const nodeRepulsion = makeNodeRepulsion(config, restartSim);
    const nodeCollision = makeNodeCollision();
    const edgeAttraction = makeEdgeAttraction(config, d3.values(graph.edges), restartSim);
    const centeringForce = makeCenteringForce(width, height);

    const simulation = this._simulation = d3.forceSimulation<Graph.Node>()
      .nodes(d3.values(graph.nodes))
      .force('gravityX', <any>gravityX)
      .force('gravityY', <any>gravityY)
      .force('nodeRepulsion', <any>nodeRepulsion)
      .force('edgeAttraction', edgeAttraction)
      .force('centering', centeringForce);

    config.onChange<boolean>('layouterOn.sim', layouterOn => {
      if (layouterOn) simulation.alpha(0.2).restart();
      else simulation.stop();
    })
  }
}

export namespace GraphLayouter {

  export class Configuration extends Model {
    constructor() {
      super({
        gravityStrength: 1e-2,
        nodeRepulsionStrength: -120,
        edgeLength: 100,

        layouterOn: true
      });
    }
  };

}

function makeGravity(config: GraphLayouter.Configuration, width: number, height: number, onChange: () => void)
    : [d3.ForcePositionX<Graph.Node>, d3.ForcePositionY<Graph.Node>] {

  const gravityX = d3.forceX<Graph.Node>(width/2)
    .strength(config.get<number>('gravityStrength'));

  const gravityY = d3.forceY<Graph.Node>(height/2)
    .strength(config.get<number>('gravityStrength'));

  config.onChange<number>('gravityStrength.sim', strength => {
    gravityX.strength(strength);
    gravityY.strength(strength);
    onChange();
  });

  return [gravityX, gravityY]
}

function makeNodeRepulsion(config: GraphLayouter.Configuration, onChange: () => void)
    : d3.ForceManyBody<Graph.Node> {

  const nodeRepulsion = d3.forceManyBody<Graph.Node>()
    .strength(config.get<number>('nodeRepulsionStrength'));

  config.onChange<number>('nodeRepulsionStrength.sim', strength => {
    nodeRepulsion.strength(strength);
    onChange();
  })

  return nodeRepulsion;
}

function makeNodeCollision() : d3.ForceCollide<Graph.Node> {
  return d3.forceCollide<Graph.Node>(node => node.type.radius);
}

function makeEdgeAttraction(config: GraphLayouter.Configuration, edges: Graph.Edge[], onChange: () => void)
    : d3.ForceLink<Graph.Node, Graph.Edge> {

  const edgeAttraction = d3.forceLink(edges)
    .distance(edge => config.get<number>('edgeLength') + edge.source.type.radius + edge.target.type.radius);

  config.onChange<number>('edgeLength.sim', length => {
    edgeAttraction.distance(edge => length + edge.source.type.radius + edge.target.type.radius);
    onChange();
  })

  return edgeAttraction;
}

function makeCenteringForce(width: number, height: number): d3.ForceCenter<Graph.Node> {
  return d3.forceCenter(width / 2, height / 2);
}
