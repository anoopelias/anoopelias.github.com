var surface = (function ($) {
    var surface = {};
    var sNode = null;
    var gridN = -1;
    var gridW = -1;
    
    // Assuming square grid
    var w = 500;
    
    surface.generate = function(pn, cn) {

        var connectedPoints = {
            n : pn,
            c : randomConnections(pn, cn)
        }
        surface.place(connectedPoints);

        return connectedPoints;
    };

    surface.place = function(connectedPoints) {
        //TODO: Assuming square grid
        gridN = Math.ceil(Math.sqrt(connectedPoints.n));
        gridW = Math.round(w / gridN);
        
        $('#surface').empty();
        sNode = SVG('surface').size(w, w);
        
        plotConnectedPoints(connectedPoints);
        
    };

    surface.arrange = function() {
    };
    
    var plotConnectedPoints = function(connectedPoints) {
        var points = randomPositions(connectedPoints.n);
        for(var i=0; i<connectedPoints.n; i++)
            plotPoint(points[i]);
            
        var connections = connectedPoints.c;
            
        for(var i=0; i<connections.length; i++)
            plotConnection(points[connections[i].from], points[connections[i].to]);
    };
    
    var plotPoint = function(p) {
        var pos = position(p);
        sNode.circle(6).attr({fill: '#000'}).center(pos.x, pos.y);
    };
    
    var plotConnection = function(from, to) {
        var fromPos = position(from);
        var toPos = position(to);
        
        sNode.line(fromPos.x, fromPos.y, toPos.x, toPos.y)
             .stroke({width : 1});
    };

    var position = function(p) {
        return {
            x : p.x * gridW + Math.round(gridW / 2),
            y : p.y * gridW + Math.round(gridW / 2)
        }
        
    };
    
    var randomConnections = function(pn, cn) {
        /*
        Generating a power set will take quadratic complexity, Nevertheless,
        can't find a better way to generate a random subset without duplicates.
        */
        var powSet = [];
        for(var i=0; i<pn; i++)
            for(var j=i+1; j<pn; j++)
                powSet.push({from : i, to : j});

        // Shuffle the power set
        // TODO: Probably you don't have to shuffle the entire set
        shuffle(powSet);
        
        
        return powSet.slice(0, cn); // Splice the first cn to get random connections.        
    };

    var randomPositions = function(n) {
        
        var powSet = [];
        for(var i=0; i<gridN; i++)
            for(var j=0; j<gridN; j++)
                powSet.push({x : i, y : j});
        
        shuffle(powSet);
        
        return powSet.slice(0, n);

    };

    //@ http://jsfromhell.com/array/shuffle [v1.0]
    function shuffle(o){ //v1.0
        for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
        return o;
    };
    
    
    return surface;
})(jQuery);
