import {Model} from './model';

export function addCheckbox(form: d3.Selection<Element, any, Element, any>, model: Model, key: string, caption: string) {
  const p = form.append('p').attr('class', 'form-line form-line--checkbox');
  const initValue = model.get<boolean>(key);

  addLabel(p, key, caption);

  const input = p.append('input')
      .attr('class', 'form-line__input')
      .attr('type', 'checkbox')
      .attr('name', key)
      .property('checked', initValue);

  input.on('click', () => model.set<boolean>(key, input.property('checked')));

  model.onChange<boolean>(`${key}.view`, value => input.property('checked', value));
}

export function addDropdown(form: d3.Selection<Element, any, Element, any>, model: Model, key: string, caption: string, options: string[]) {
  const p = form.append('p').attr('class', 'form-line form-line--dropdown');
  const initValue = model.get<string>(key);

  addLabel(p, key, caption);

  const select = p.append('select');

  for (const option of options) {
    select.append('option')
      .attr('label', option)
      .attr('value', option)
      .property('selected', option === initValue)
  }

  select.on('change', () => {
    model.set<string>(key, select.property('value'));
  });
}

export function addSlider(form: d3.Selection<Element, any, Element, any>, model: Model, key: string, caption: string, format: (n: number) => string, scale: d3.ScaleNumeric<number>) {
  const p = form.append('p').attr('class', 'form-line form-line--slider');
  const initValue = model.get<number>(key);

  addLabel(p, key, caption);

  const valueLabel = p.append('span')
      .attr('class', 'form-line--slider__value')
      .attr('for', key)
      .text(format(initValue));

  const input = p.append('input')
      .attr('class', 'form-line__input')
      .attr('type', 'range')
      .attr('name', key)
      .attr('min', 0)
      .attr('max', 1)
      .attr('step', 0.01)
      .property('value', scale(initValue));

  input.on('input', () => {
    const inputValue: number = input.property('valueAsNumber');
    model.set<number>(key, scale.invert(inputValue));
  });

  model.onChange<number>(`${key}.view`, value => {
    valueLabel.text(format(value));
    input.property('value', scale(value));
  });
}

function addLabel(p: d3.Selection<Element, {}, Element, {}>, key: string, caption: string) {
  p.append('label')
      .attr('class', 'form-line__label')
      .attr('for', key)
      .text(`${caption}:`);
}
