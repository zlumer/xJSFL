/* DONE:
- create variables for immediate children
- templates
- create variables for nested children
- have a static string property with the name of the symbol (to create from application domain)
- create wrappers for exported items
- create getters for wrappers
- optimize
low priority:
- parse all the items, not only selected ones
*/
/* TODO:
- add imports
*/
/*
class GameWindow
{
	public static const ASSET_NAME:String = "GameWindow";
}
*/
function addprefix(prefix, hash)
{
	var result = {};
	for (var s in hash)
	{
		result[prefix + "$" + s] = hash[s];
	}
	return result;
}
function merge(obj, add)
{
	for (var s in add)
	{
		obj[s] = add[s];
	}
	return obj;
}

function iterateTimeline(timeline, elementCallback)
{
	var currentLayers = timeline.layers;
	for ( var i = 0; i < currentLayers.length; i++ )
	{
		if (currentLayers[i].layerType == "guide")
			continue;
		
		var currentFrames = currentLayers[i].frames;
		for ( var j = 0; j < currentFrames.length; j++ )
		{
			var currentElements = currentFrames[j].elements;
			for ( var k = 0; k < currentElements.length; k++ )
			{
				var elem = currentElements[k];
				elementCallback(elem);
			}
		}
	}
}

function collectChildren(item)
{
	var elements = [];
	
	function processElement(elem)
	{
		if (elem.name)
		{
			var isWrapper = ((elem.elementType == "instance") && elem.libraryItem.linkageExportForAS);
			
			var children = [];
			if (elem.elementType == "instance" && !isWrapper)
			{
				children = collectChildren(elem.libraryItem);
			}
			
			var found = false;
			
			for (var s in elements)
			{
				if (elements[s]["name"] == elem.name)
					found = true;
			}
			
			if (!found)
			{
				elements.push({
					'name':elem.name,
					'item':elem,
					'class':ActionScript.getClass(elem),
					'wrapper':isWrapper,
					'children':children
				});
			}
			// trace(elem.name + ":" + ActionScript.getClass(elem));
		}
		return false;
	}
	
	if ('timeline' in item)
		iterateTimeline(item.timeline, processElement);
	
	return elements;
}

// recursively set parent for all children in array
function setParent(childrenArray, parent/* = null*/)
{
	for (var s in childrenArray)
	{
		var child = childrenArray[s];
		child['parent'] = parent;
		if (child.children.length > 0)
		{
			setParent(child.children, child);
		}
	}
}
function foldChildrenArray(childrenArray)
{
	function foldOne(c, t)
	{
		var a = [c];
		for (var j in c.children)
		{
			a = a.concat(foldOne(c.children[j], t + "  "));
		}
		return a;
	}
	
	var arr = [];
	for (var s in childrenArray)
	{
		arr = arr.concat(foldOne(childrenArray[s], ""));
	}
	return arr;
}

function getParentArray(elem)
{
	var chain = [];
	var cur = elem;
	while (cur = cur.parent)
		chain.unshift(cur);
	return chain;
}

function col_e(item)
{
	trace(item);
	var className = item.linkageClassName;//item.shortName.replace(/\.\w+$/, '').toCamelCase().toSentenceCase();
	// item.linkageClassName;
	trace(FLA_NAME + "::" + className);
	
	var baseClass = ActionScript.getBaseClass(item);
	
	var elements = collectChildren(item);
	setParent(elements);
	// trace("----------------------");
	//inspect(elements);
	// trace("----------------------");
	// trace("elements.length: " + elements.length);
	elements = foldChildrenArray(elements);
	// trace("elements.length: " + elements.length);
	function setNames(e)
	{
		var parr = getParentArray(e).map(function(p) { return p.name; } );
		e.parentName = parr.length ? parr.join("$") : "design";
		e.var_name = (parr.length ? parr.join("$") + "$" : "") + e.name;
	}
	elements.forEach(setNames);
	// trace("elements.length: " + elements.length);
	var wrappers = elements.filter(function(e){ return e.wrapper; });
	elements = elements.filter(function(e){ return !(e.wrapper); });
	// trace("elements.length: " + elements.length);
	trace('--------------');
	
	function tdir(s)
	{
		return ('//user/assets/templates/as/DesignWrapper' + s + '.as');
	}
	
	wrappers.forEach(function(e){ e['class'] = ACTIONSCRIPT_PACKAGE + '.' + e['class']; });
	
	var data =
	{
		"date":(new Date()).format(),
		"elements":elements.map(function(e){ return new Template(tdir('.var'), e).render(); }).join("\n"),
		"elements_init":elements.map(function(e){ return new Template(tdir('.varinit'), e).render(); }).join("\n"),
		"getters":wrappers.map(function(e){ return new Template(tdir('.getter'), e).render(); }).join("\n"),
		"getters_init":wrappers.map(function(e){ return e.var_name + ";"; }).join("\n"),
		"name":className,
		"symbolType":baseClass,
		"package":ACTIONSCRIPT_PACKAGE
	};

	var outFile = AUTOLIB_ROOT_DIR + className + ".as";
	new Template(tdir(''), data).save(outFile);
	trace("saved to: " + outFile);
}

xjsfl.init(this);

fl.outputPanel.clear();


var FLA_NAME = URI.getName(document.path, true);//.toCamelCase().toSentenceCase();
var ACTIONSCRIPT_PACKAGE = "com.zlumer.autolib." + FLA_NAME;
var AUTOLIB_ROOT_DIR = URI.getFolder(document.path) + ACTIONSCRIPT_PACKAGE.split('.').join('\\') + "\\";

new Folder(URI.getFolder(AUTOLIB_ROOT_DIR)).remove(true);

var collection = $$(':symbol:exported:selected')//.sort();
//[linkageExportForAS]
// collection.list();
collection.each(col_e);