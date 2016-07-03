export class Model {
  private dispatch: d3.Dispatch<any>
  private values: {[key:string]: any}

  constructor(initialModel: {[key:string]: any}) {
    this.dispatch = d3.dispatch(...Object.keys(initialModel));
    this.values = initialModel;
  }

  onChange<T>(key: string, callback: (value: T) => void) {
    this.dispatch.on(key, callback);
  }

  get<T>(key: string) : T {
    return <T>this.values[key];
  }

  set<T>(key: string, value: T) {
    this.values[key] = value;
    this.dispatch.call(key, null, value);
  }
}
