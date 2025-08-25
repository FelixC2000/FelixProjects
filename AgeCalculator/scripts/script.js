function calculateAge(){
    const yearElement1 = document.getElementById("year");
    const yearElement2 = document.getElementById("year2");
    const resultElement = document.getElementById("result");
    const dateElement = document.getElementById("date");
    
    if (!yearElement1 || !yearElement2 || !resultElement || !dateElement) {
        console.error("Required elements not found");
        return;
    }
    
    const year1 = parseInt(yearElement1.value);
    const year2 = parseInt(yearElement2.value);
    
    if (isNaN(year1) || isNaN(year2)) {
        resultElement.textContent = "Please enter valid years";
        return;
    }
    
    const age = year1 - year2;
    resultElement.textContent = "Your age is : "+age;
    const date = new Date(year1, 0 ,1).getTime();
    dateElement.textContent = date;
}