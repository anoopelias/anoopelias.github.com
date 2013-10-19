var surface = (function ($) {
    var surface = {};
    var svgNode = null;
    
    $(function() {
        svgNode = SVG('surface').size(600, 500);
    });

    surface.generate = function(pn, cn) {

        /*
        Generating a power set will take quadratic complexiety, Nevertheless,
        can't find a better way to generate a random subset without duplicates.
        */
        var powSet = [];
        for(var i=0; i<pn; i++) {
            for(var j=i+1; j<pn; j++) {
                powSet.push({
                    from : i,
                    to : j
                });
            }
        }

        // Shuffle the power set
        shuffle(powSet);

        var connectedPoints = {
            n : pn,
            c : powSet.slice(cn) // Splice the first cn to get random connections.
        }
        
        surface.place(connectedPoints);

        return connectedPoints;
    }

    surface.place = function(connectedPoints) {
        console.log(svgNode);
        
    }

    //@ http://jsfromhell.com/array/shuffle [v1.0]
    function shuffle(o){ //v1.0
        for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    };
    return surface;
})(jQuery);
