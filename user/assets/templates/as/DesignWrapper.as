package {package?}
{
	{>imports?}
	/**
	 * {name}
	 * @author	zLumer
	 */
	public class {name}
	{
		static public const CLASS_NAME:String = "{name}";
		static public const __LAZY__:Boolean = true;
		
		public var design:{symbolType};
		
		{>elements?}
		
		{>dynamic_elements?}
		
		{>getters?}
		
		public function {name}(design:{symbolType})
		{
			if (design)
				__init__(design);
		}
		public function __init__(design:{symbolType}):void
		{
			this.design = design;
			
			{>elements_init}
			
			if (!__LAZY__)
			{
				{>getters_init}
			}
		}
	}
}