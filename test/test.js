console.log("first");

setTimeout(() => {
  console.log("second");
}, 2000);

console.log("third");

    // async/await example
    async function fetchData() {
      // Simulating asynchronous code
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve('Data fetched!');
        }, 1000);
      });
    }

    async function main() {
      try {
        const data = await fetchData();
        console.log(data);
        const outputElement = document.querySelector('.output');
        if (outputElement) {
          outputElement.textContent = data;
        }
      } catch (error) {
        console.error('An error occurred:', error);
        const outputElement = document.querySelector('.output');
        if (outputElement) {
          outputElement.textContent = 'Error occurred';
        }
      }
    }

    main();

    // then() callback example
     const myPromise = new Promise((resolve, reject) => {
      setTimeout(() => {
        const randomNumber = Math.random();
        if (randomNumber < 0.5) {
          resolve(randomNumber);
        } else {
          reject(new Error("Random number is too high"));
        }
      }, 1000);
    });

    myPromise.then(
      (resolvedValue) => {
        console.log(`Promise resolved with value: ${resolvedValue}`);
      },
      (error) => {
        console.error(`Promise rejected with error: ${error.message}`);
      }
    );