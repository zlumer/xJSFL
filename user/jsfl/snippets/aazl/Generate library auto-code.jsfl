/* DONE:
- create variables for immediate children
- templates
- create variables for nested children
- have a static string property with the name of the symbol (to create from application domain)
- create wrappers for exported items
- create getters for wrappers
- optimize
- add imports
- fix some instance first-frame unavailability
low priority:
- parse all the items, not only selected ones
*/
/* TODO:
- add fla svn revision info
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
	var context = {};
	var currentLayers = timeline.layers;
	for ( var i = 0; i < currentLayers.length; i++ )
	{
		context.layerIndex = i;
		context.layer = currentLayers[i];
		
		if (context.layer.layerType == "guide")
			continue;
		
		var currentFrames = currentLayers[i].frames;
		for ( var j = 0; j < currentFrames.length; j++ )
		{
			context.frameIndex = j;
			context.frame = currentFrames[j];
			
			var currentElements = context.frame.elements;
			for ( var k = 0; k < currentElements.length; k++ )
			{
				context.elementIndex = k;
				context.element = currentElements[k];
				
				elementCallback(context);
			}
		}
	}
}

function collectChildren(item)
{
	var elements = [];
	
	function processElement(context)
	{
		var elem = context.element;
		
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
					found = elements[s];
			}
			
			var firstFrame = (context.frameIndex == 0);
			
			if (!found)
			{
				elements.push({
					'name':elem.name,
					'item':elem,
					'class':ActionScript.getClass(elem),
					'wrapper':isWrapper,
					'firstFrame':firstFrame,
					'children':children
				});
				
			}
			else
			{
				found.firstFrame = firstFrame;
				found.multipleInstances = true;
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
		child.parent = parent;
		child.dynamic = child.multipleInstances || !child.firstFrame || (parent && parent.dynamic);
		if (child.children.length > 0)
		{
			setParent(child.children, child);
		}
	}
}
function foldChildrenArray(childrenArray)
{
	function foldOne(c)
	{
		var a = [c];
		for (var j in c.children)
		{
			a = a.concat(foldOne(c.children[j]));
		}
		return a;
	}
	
	var arr = [];
	for (var s in childrenArray)
	{
		arr = arr.concat(foldOne(childrenArray[s]));
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
	// trace(item);
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
	elements = elements.filter(function(e){ return !e.wrapper; });
	var dynamicElements = elements.filter(function(e){ return e.dynamic; });
	elements = elements.filter(function(e){ return !e.dynamic; });
	// trace("elements.length: " + elements.length);
	// trace('--------------');
	
	wrappers.forEach(function(e){ e['class'] = ACTIONSCRIPT_PACKAGE + '.' + e['class']; });
	
	// imports
	var importsHash = {};
	importsHash[baseClass] = true;
	function addImport(e)
	{
		importsHash[e["class"]] = true;
	}
	elements.forEach(addImport);
	wrappers.forEach(addImport);
	dynamicElements.forEach(addImport);
	var imports = [];
	for (var s in importsHash)
	{
		imports.push("import " + s + ";");
	}
	
	function renderTemplateMapper(tmp)
	{
		return function(e)
		{
			var t = new Template();
			t.input = tmp;
			t.data = e;
			return t.render();
		};
	}
	
	var data =
	{
		"date":(new Date()).format(),
		"elements":elements.map(renderTemplateMapper(TEMPLATE_VAR)).join("\n"),
		"dynamic_elements":dynamicElements.map(renderTemplateMapper(TEMPLATE_SAFE_GETTER)).join("\n"),
		"getters":wrappers.map(renderTemplateMapper(TEMPLATE_GETTER)).join("\n"),
		"elements_init":elements.map(renderTemplateMapper(TEMPLATE_VAR_INIT)).join("\n"),
		"getters_init":wrappers.map(renderTemplateMapper(TEMPLATE_GETTER_INIT)).join("\n"),
		"imports":imports.join("\n"),
		"name":className,
		"symbolType":baseClass,
		"package":ACTIONSCRIPT_PACKAGE
	};

	function tdir(s)
	{
		return ('//user/assets/templates/as/DesignWrapper' + s + '.as');
	}
	var outFile = AUTOLIB_ROOT_DIR + className + ".as";
	new Template(tdir(''), data).save(outFile);
	trace("saved to: " + outFile);
}

xjsfl.init(this);

fl.outputPanel.clear();

/*****************************************************************************/
var TEMPLATE_SAFE_GETTER, TEMPLATE_VAR, TEMPLATE_GETTER, TEMPLATE_VAR_INIT, TEMPLATE_GETTER_INIT;
__init_consts__();
/*****************************************************************************/

var FLA_NAME = URI.getName(document.path, true);//.toCamelCase().toSentenceCase();
var ACTIONSCRIPT_PACKAGE = "com.zlumer.autolib." + FLA_NAME;
var AUTOLIB_ROOT_DIR = URI.getFolder(document.path) + ACTIONSCRIPT_PACKAGE.split('.').join('\\') + "\\";

new Folder(URI.getFolder(AUTOLIB_ROOT_DIR)).remove(true);

var collection = $$(':symbol:exported')//.sort();
// collection.list();
collection.each(col_e);


/*****************************************************************************/
function __init_consts__()
{
	TEMPLATE_SAFE_GETTER = 'public function get {var_name}():{class} { return ({parentName} ? {parentName}["{name}"] : null); }';
	TEMPLATE_VAR = 'public var {var_name}:{class};';
	TEMPLATE_GETTER = '\
private var _{var_name}:{class};\n\
public function get {var_name}():{class}\n\
{\n\
	if (!_{var_name})\n\
		_{var_name} = new {class}({parentName}["{name}"]);\n\
	return _{var_name};\n\
}\n\
public function set {var_name}(value:{class}):void\n\
{\n\
	_{var_name} = value;\n\
}';

	TEMPLATE_VAR_INIT = '{var_name} = {parentName} ? {parentName}["{name}"] : null;';
	TEMPLATE_GETTER_INIT = '{var_name};';
};