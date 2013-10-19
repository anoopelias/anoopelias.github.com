var surface = (function ($) {
    var surface = {};
    var sNode = null;
    var gridN = -1;
    var gridW = -1;
    
    // Assuming square grid
    var w = 500;
    
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
            c : powSet.slice(0, cn) // Splice the first cn to get random connections.
        }
        
        surface.place(connectedPoints);

        return connectedPoints;
    };

    surface.place = function(connectedPoints) {
        //TODO: Assuming square grid
        gridN = Math.ceil(Math.sqrt(connectedPoints.n));
        gridW = Math.round(w / gridN);
        
        var powSet = [];
        for(var i=0; i<gridN; i++) {
            for(var j=0; j<gridN; j++) {
                powSet.push({
                    x : i,
                    y : j
                })
            }
        }
        
        shuffle(powSet);
        
        var points = powSet.slice(0, connectedPoints.n);
        
        
        $('#surface').empty();
        sNode = SVG('surface').size(w, w);
        
        for(var i=0; i<connectedPoints.n; i++) {
            plotPoint(points[i]);
        }
        
    };
    
    var plotPoint = function(p) {
        var x = p.x * gridW + Math.round(gridW / 2);
        var y = p.y * gridW + Math.round(gridW / 2);
        
        sNode.circle(6).attr({fill: '#000'}).move(x, y);
    };

    //@ http://jsfromhell.com/array/shuffle [v1.0]
    function shuffle(o){ //v1.0
        for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    };
    
    
    return surface;
})(jQuery);
