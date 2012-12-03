/* DONE:
- create variables for immediate children
- templates
- create variables for nested children
- have a static string property with the name of the symbol (to create from application domain)
- create wrappers for exported items
- create getters for wrappers
*/
/* TODO:

low priority:
- parse all the items, not only selected ones
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

xjsfl.init(this);

function collectChildren(item)
{
	var elements = [];
	
	function processElement(elem)
	{
		if (elem.name)
		{
			var isWrapper = ((elem.elementType == "instance") && elem.libraryItem.linkageExportForAS);
			
			var children = [];
			if (elem.elementType == "instance")
			{
				children = collectChildren(elem.libraryItem);
			}
			
			elements.push({
				'name':elem.name,
				'item':elem,
				'class':ActionScript.getClass(elem),
				'wrapper':isWrapper,
				'children':children
			});
			// trace(elem.name + ":" + ActionScript.getClass(elem));
		}
		return false;
	}
	function processLayer(layer, index, layers, context)
	{
		if (layer.layerType == 'guide')
			return false;
	}
	
	Iterators.items([item], null, processLayer, null, processElement);
	
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
	var arr = [];
	for (var s in childrenArray)
	{
		var child = childrenArray[s];
		arr.push(child);
		if (child.children.length > 0)
		{
			arr = arr.concat(foldChildrenArray(child.children));
		}
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
	var flaName = URI.getName(document.path, true);//.toCamelCase().toSentenceCase();
	trace(flaName + "::" + className);
	
	var baseClass = ActionScript.getBaseClass(item);
	
	var elements = collectChildren(item);
	setParent(elements);
	elements = foldChildrenArray(elements);
	function setNames(e)
	{
		var parr = getParentArray(e).map(function(p) { return p.name; } );
		e.parentName = parr.length ? parr.join("$") : "design";
		e.var_name = (parr.length ? parr.join("$") + "$" : "") + e.name;
	}
	elements.forEach(setNames);
	var wrappers = elements.filter(function(e){ return e.wrapper; });
	elements = elements.filter(function(e){ return !(e.wrapper); });
	trace('--------------');
	
	function tdir(s)
	{
		return ('//user/assets/templates/as/DesignWrapper' + s + '.as');
	}
	
	var asPackage = "com.zlumer.autolib." + flaName;
	wrappers.forEach(function(e){ e['class'] = asPackage + '.' + e['class']; });
	
	var data =
	{
		"date":(new Date()).format(),
		"elements":elements.map(function(e){ return new Template(tdir('.var'), e).render(); }).join("\n"),
		"elements_init":elements.map(function(e){ return new Template(tdir('.varinit'), e).render(); }).join("\n"),
		"getters":wrappers.map(function(e){ return new Template(tdir('.getter'), e).render(); }).join("\n"),
		"getters_init":wrappers.map(function(e){ return e.var_name + ";"; }).join("\n"),
		"name":className,
		"symbolType":baseClass,
		"package":asPackage
	};

	var outFile = URI.getFolder(document.path) + data["package"].split('.').join('/') + "/" + className + ".as";
	new Template(tdir(''), data).save(outFile);
	trace("saved to: " + outFile);
}

fl.outputPanel.clear();

var collection = $$(':symbol:exported').sort();
//[linkageExportForAS]
collection.list();
collection.each(col_e);