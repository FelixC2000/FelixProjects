document.addEventListener('DOMContentLoaded', function () {
    // Fetch available currencies from the API
    fetch('https://open.er-api.com/v6/latest')
        .then(response => response.json())
        .then(data => {
            const currencies = Object.keys(data.rates);
            
            // Populate the currency dropdowns
            const fromCurrencySelect = document.getElementById('from');
            const toCurrencySelect = document.getElementById('to');

            currencies.forEach(currency => {
                const option = document.createElement('option');
                option.value = currency;
                option.text = currency;
                fromCurrencySelect.add(option);
            });

            currencies.forEach(currency => {
                const option = document.createElement('option');
                option.value = currency;
                option.text = currency;
                toCurrencySelect.add(option);
            });
        })
        .catch(error => console.error('Error fetching currencies:', error));
});

function convertCurrency() {
    const amount = document.getElementById('amount').value;
    const fromCurrency = document.getElementById('from').value;
    const toCurrency = document.getElementById('to').value;

    fetch(`https://open.er-api.com/v6/latest?base=${fromCurrency}`)
        .then(response => response.json())
        .then(data => {
            const exchangeRate = data.rates[toCurrency];
            const result = (amount * exchangeRate).toFixed(2);

            document.getElementById('result').textContent = `${amount} ${fromCurrency} is equal to ${result} ${toCurrency}`;
        })
        .catch(error => console.error('Error converting currency:', error));
}
