import { from } from './rxjs.js';

const array = [10, 20, 30];
const result = from(array);
result.subscribe((x) => console.log(x));
