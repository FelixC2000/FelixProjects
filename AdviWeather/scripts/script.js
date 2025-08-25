$(document).ready(function() {
    var apiEndpoint = "https://api.openweathermap.org/data/2.5/forecast";
    var apiKey = "5446be76d7c7bdd03fa8dc5f3a9eddb6"; // Move to environment variables in production

    $("#searchBtn").click(function() {
        var location = $("#location").val();
        if (!location || location.trim() === "") {
            alert("Please enter a location");
            return;
        }
        var queryUrl = apiEndpoint + "?q=" + encodeURIComponent(location) + "&cnt=5&units=metric&appid=" + apiKey;
        $.ajax({
            url: queryUrl,
            method: "GET",
            success: function(response) {
                console.log("Weather API response received");
                if (!response || !response.list || !Array.isArray(response.list)) {
                    $("#forecast").html("<p>Invalid weather data received.</p>");
                    return;
                }
                var forecastHtml = "";
                for (var i = 0; i < response.list.length; i++) {
                    if (!response.list[i] || !response.list[i].weather || !response.list[i].weather[0]) {
                        continue;
                    }
                    var date = new Date(response.list[i].dt * 1000);
                    var dayOfWeek = date.toLocaleDateString("en-US", { weekday: 'long', day: 'numeric' });

                    var weatherIconUrl = "https://openweathermap.org/img/w/" + response.list[i].weather[0].icon + ".png";
                    var minTemp = response.list[i].main.temp_min.toFixed(1);
                    var maxTemp = response.list[i].main.temp_max.toFixed(1);
                    var description = response.list[i].weather[0].description;
                    var dayDiv = $("<div class='day'></div>");
                    dayDiv.append($("<div class='date'></div>").text(dayOfWeek));
                    dayDiv.append($("<div class='weather-icon'><img src='" + weatherIconUrl + "'></div>"));
                    dayDiv.append($("<div class='temp'></div>").text(maxTemp + "°C / " + minTemp + "°C"));
                    dayDiv.append($("<div class='description'></div>").text(description));
                    forecastHtml += dayDiv[0].outerHTML;

                }
                $("#forecast").html(forecastHtml);
            },
            error: function() {
                console.log("Error fetching forecast");
                $("#forecast").html("<p>Error fetching forecast. Please try again.</p>");
            }
        });
    });
});