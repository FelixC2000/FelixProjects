function calculateAge(){
    const year1 = parseInt(document.getElementById("year").value);
    const year2 = parseInt(document.getElementById("year2").value);
    
    if (isNaN(year1) || isNaN(year2)) {
        document.getElementById("result").textContent = "Please enter valid years";
        return;
    }
    
    const rest = year1 - year2;
    document.getElementById("result").textContent = "Your age is : "+rest;
    const date = new Date(year1, 0 ,1).getTime();
    document.getElementById("date").textContent = date;
}