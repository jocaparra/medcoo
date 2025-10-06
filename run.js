console.log('STARTING APPLICATION RUNNER');
import('./index.js').then(() => {
  console.log('INDEX IMPORTED');
}).catch(err => {
  console.error('INDEX IMPORT ERROR', err);
  process.exit(1);
});
