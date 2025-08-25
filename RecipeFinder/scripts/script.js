const apiKey = process.env.SPOONACULAR_API_KEY || 'YOUR_API_KEY_HERE'; // Use environment variable
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const recipeContainer = document.getElementById('recipeContainer');
const recipeImage = document.getElementById('recipeImage');
const recipeName = document.getElementById('recipeName');
const recipeInformation = document.getElementById('recipeInformation'); // Added an element for recipe information

searchButton.addEventListener('click', searchRecipe);

async function searchRecipe() {
    const searchTerm = searchInput.value;

    try {
        // First, get the recipe based on the ingredients
        const response = await fetch(`https://api.spoonacular.com/recipes/complexSearch?apiKey=${apiKey}&query=${searchTerm}&addRecipeInformation=true`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const recipe = data.results[0];

            // Update the display with the retrieved recipe data
            recipeContainer.style.display = 'block';
            recipeImage.src = recipe.image ? recipe.image : 'placeholder-image.jpg';
            recipeName.textContent = recipe.title;

            // Fetch and display full recipe information
            const recipeInformationResponse = await fetch(`https://api.spoonacular.com/recipes/${recipe.id}/information?apiKey=${apiKey}`);
            if (!recipeInformationResponse.ok) {
                throw new Error(`HTTP error! status: ${recipeInformationResponse.status}`);
            }
            const recipeInformationData = await recipeInformationResponse.json();

            if (recipeInformationData.instructions) {
                // Remove HTML tags from the instructions using a simple regex
                const plainTextInstructions = recipeInformationData.instructions.replace(/<[^>]*>/g, '');
                recipeInformation.textContent = `Instructions: ${plainTextInstructions}`;
            } else {
                recipeInformation.textContent = 'Recipe information not available.';
            }
        } else {
            recipeContainer.style.display = 'none';
            console.log('Recipe not found.');
            recipeInformation.textContent = 'Recipe not found. Please try a different search term.';
        }
    } catch (error) {
        console.error(error);
    }
}

// Function to search recipes by specific nutrients
async function searchRecipesByNutrients() {
    try {
        const response = await fetch(`https://api.spoonacular.com/recipes/findByNutrients?apiKey=${apiKey}&maxCarbs=50&maxProtein=20&maxFat=10`);
        const data = await response.json();

        if (data.length > 0) {
            // Display or use the recipes retrieved based on the specified nutrients
            console.log(data);
        } else {
            console.log('No recipes found based on specified nutrients.');
        }
    } catch (error) {
        console.error(error);
    }
}

// Call the searchRecipesByNutrients function when needed
searchRecipesByNutrients();
