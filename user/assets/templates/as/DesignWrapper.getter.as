private var _{var_name}:{class};
public function get {var_name}():{class}
{
	if (!_{var_name})
		_{var_name} = new {class}({parentName}["{name}"]);
	return _{var_name};
}
public function set {var_name}(value:{class}):void
{
	_{var_name} = value;
}