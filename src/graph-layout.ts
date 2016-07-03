import {Model} from './model';
import {Point, Vector} from './geometry';
import {Graph, GraphMapping} from './graph';

let instanceCount = 0;

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

  constructor(config: GraphLayouter.Configuration, graph: Graph, morphism: GraphMapping, width: number, height: number) {
    instanceCount++;
    this._config = config;

    const restartSim = () => this.restart();

    const [gravityX, gravityY] = makeGravity(config, width, height, restartSim);
    const nodeRepulsion = makeNodeRepulsion(config, restartSim);
    const nodeCollision = makeNodeCollision();
    const edgeAttraction = makeEdgeAttraction(config, d3.values(graph.nodes), d3.values(graph.edges), restartSim);
    const centeringForce = makeCenteringForce(width, height);
    const [morphismX, morphismY] = makeMorphismForce(morphism, config, restartSim);

    const simulation = this._simulation = d3.forceSimulation<Graph.Node>()
      .nodes(d3.values(graph.nodes))
      .force('gravityX', <any>gravityX)
      .force('gravityY', <any>gravityY)
      .force('nodeRepulsion', <any>nodeRepulsion)
      .force('edgeAttraction', edgeAttraction)
      .force('centering', centeringForce)
      .force('morphismX', <any>morphismX)
      .force('morphismY', <any>morphismY);

    config.onChange<boolean>(`layouterOn.graphLayouter${instanceCount}`, layouterOn => {
      if (layouterOn) simulation.alpha(0.2).restart();
      else simulation.stop();
    })

    config.onChange<boolean>(`autoCenter.graphLayouter${instanceCount}`, autoCenter => {
      simulation.force('centering', autoCenter ? centeringForce : null);
      restartSim();
    })

    simulation.on(`tick.graphLayouter${instanceCount}`, () => {
      morphismX.x(morphismX.x());
      morphismY.y(morphismY.y())
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
        edgeStrength: 0.2,
        mappingConsistency: 0.3,

        layouterOn: true,
        autoCenter: true,
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

  config.onChange<number>(`gravityStrength.graphLayouter${instanceCount}`, strength => {
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

  config.onChange<number>(`nodeRepulsionStrength.graphLayouter${instanceCount}`, strength => {
    nodeRepulsion.strength(strength);
    onChange();
  })

  return nodeRepulsion;
}

function makeNodeCollision() : d3.ForceCollide<Graph.Node> {
  return d3.forceCollide<Graph.Node>(node => node.type.radius);
}

function makeEdgeAttraction(config: GraphLayouter.Configuration, nodes: Graph.Node[], edges: Graph.Edge[], onChange: () => void)
    : d3.ForceLink<Graph.Node, Graph.Edge> {

  const degree: {[key:string]: number} = {};
  nodes.forEach(node => degree[node.id] = 0);
  edges.forEach(edge => {
    degree[edge.source.id]++;
    degree[edge.target.id]++;
  });

  function makeStrength(strength: number): (e: Graph.Edge) => number {
    return e => strength / Math.min(degree[e.source.id], degree[e.target.id]);
  }

  const edgeAttraction = d3.forceLink(edges)
    .distance(edge =>
      config.get<number>('edgeLength') + edge.source.type.radius + edge.target.type.radius)
    .strength(makeStrength(config.get<number>('edgeStrength')));

  config.onChange<number>(`edgeLength.graphLayouter${instanceCount}`, length => {
    edgeAttraction.distance(edge => length + edge.source.type.radius + edge.target.type.radius);
    onChange();
  })

  config.onChange<number>(`edgeStrength.graphLayouter${instanceCount}`, strength => {
    edgeAttraction.strength(makeStrength(strength));
    onChange();
  })

  return edgeAttraction;
}

function makeCenteringForce(width: number, height: number): d3.ForceCenter<Graph.Node> {
  return d3.forceCenter(width / 2, height / 2);
}

function makeMorphismForce(morphism: GraphMapping, config: GraphLayouter.Configuration, onChange: () => void)
    : [d3.ForcePositionX<Graph.Node>, d3.ForcePositionY<Graph.Node>] {

  const morphismX = d3.forceX<Graph.Node>()
    .x(n1 => {
      const n2 = morphism.nodes[n1.id];
      return n2 ? n2.x : 0;
    });

  const morphismY = d3.forceY<Graph.Node>()
    .y(n1 => {
      const n2 = morphism.nodes[n1.id];
      return n2 ? n2.y : 0;
    });

  function makeStrength(strength: number): (n: Graph.Node) => number {
    return n1 => {
      const n2 = morphism.nodes[n1.id];
      if (!n2) return 0;
      if (n2.pinned) return Math.min(1, 2*strength);
      else return strength;
    };
  }

  const initStrength = makeStrength(config.get<number>('mappingConsistency'));

  morphismX.strength(initStrength);
  morphismY.strength(initStrength);

  config.onChange<number>(`mappingConsistency.graphLayouter${instanceCount}`, strength => {
    const newStrength = makeStrength(strength);
    morphismX.strength(newStrength);
    morphismY.strength(newStrength);
    onChange();
  });

  return [morphismX, morphismY];
}
