<Query Kind="Program">
  <NuGetReference>Newtonsoft.Json</NuGetReference>
  <Namespace>Newtonsoft.Json</Namespace>
  <Namespace>System.Drawing</Namespace>
</Query>

void Main()
{
	var dir = @"D:\temp\imgproc\pop\";
	var saveFile = @"D:\projects\generative\007\stats\stats.json";
	//var patterns = ParsePatternFiles(dir);
	var patterns = ReloadPatterns(saveFile);
	//SavePatterns(saveFile, patterns);

	FilterPatterns(patterns);
	//patterns.SelectMany(x => x.Intervals.Select(z => z.width)).Distinct().OrderBy(x => x).Dump();
	var seqPairs = patterns.Select(p => p.Intervals.Zip(p.Intervals.Skip(1).Concat(new[] { p.Intervals.First()}), (a,b) => new {a, b})).SelectMany(x => x).ToArray();
	var stateGroups = seqPairs.GroupBy(x => x.a.width, x => x.b.width);
	//stateGroups.OrderBy(x => x.Key).Select(x => new{x.Key, count = x.Count()}).Dump();
	//var dim = stateGroups.Select(x => x.Key).Max();
	var keys = stateGroups.Select(x => x.Key).OrderBy(x => x).ToArray();
	var stats = stateGroups.Select(x => new { state = x.Key, transitions = keys.Select(k => new { dest = k, probability = (double)x.Count(y => y == k) / x.Count() })})
		.OrderBy(x => x.state).ToArray();
	JsonConvert.SerializeObject(stats, Newtonsoft.Json.Formatting.None).Dump();
}

public void FilterPatterns(IEnumerable<PatternFile> patterns)
{
	
	foreach(var pattern in patterns)
	{
		pattern.Intervals = pattern.Intervals
			.Where(x => x.width != 0)
			.ToList();
		foreach(var i in pattern.Intervals)
		{
			i.width = i.width / 2;
			if (i.width == 0)
			{
				i.width = 1;
			}
			if(i.width > 20)
			{
				i.width -= i.width % 10;
				//i.width = 20;
			}
		}
	}
}

public IEnumerable<PatternFile> ReloadPatterns(string patternFile)
{
	var json = File.ReadAllText(patternFile);
	var patterns = JsonConvert.DeserializeObject<PatternFile[]>(json);
	return patterns;
}

public FileInfo SavePatterns(string destFile, IEnumerable<PatternFile> patterns)
{
	var json = JsonConvert.SerializeObject(patterns.ToArray());
	var file = new FileInfo(destFile);
	if(file.Exists) throw new Exception("file already exists");
	File.WriteAllText(file.FullName, json);
	return file;
}

public IEnumerable<PatternFile> ParsePatternFiles(string dir)
{
	var patterns = Directory.GetFiles(dir, "*.png").Select(file =>
	{
		var intervals = new List<Interval>();
		var b = new Bitmap(file);
		var current = new Interval(b.GetPixel(0, 0));
		intervals.Add(current);
		for (int i = 1; i < b.Width; i++)
		{
			var p = b.GetPixel(i, 0);
			var h = ColorToHex(p);
			if (h == current.color)
			{
				current.width += 1;
			}
			else
			{
				if (i > 209) break;
				current = new Interval(p);
				intervals.Add(current);
			}
		}
		var last = intervals.Last();
		last.width = last.width / 2;
		return new PatternFile { Intervals = intervals, Name = new FileInfo(file).Name };
	});
	return patterns;
}

public class PatternFile
{
	public List<Interval> Intervals;
	public string Name;
}

public class Interval
{
	public string color { get; set; }
	public int width { get; set;}
	
	public Interval(){}
	
	public Interval(string c)
	{
		this.color = c;
		this.width = 1;
	}
	
	public Interval(Color c)
	{
		this.color = ColorToHex(c);
		this.width = 1;
	}
}

public static string ColorToHex(Color c)
{
	return ColorTranslator.ToHtml(Color.FromArgb(c.ToArgb()));
}