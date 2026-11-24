param([Parameter(Mandatory=$true)][string]$SpecPath,[Parameter(Mandatory=$true)][string]$OutputPath)
Add-Type -AssemblyName System.Drawing
$fontSpecs=Get-Content -LiteralPath $SpecPath -Raw | ConvertFrom-Json
$culture=[Globalization.CultureInfo]::InvariantCulture
function Num([single]$n){$n.ToString('0.###',$culture)}
$result=@()
foreach($spec in $fontSpecs){
 $family=[Drawing.FontFamily]::new($spec.family)
 if($family.Name -ne $spec.family){throw "Font fallback: $($spec.family) -> $($family.Name)"}
 $fontStyle=if($spec.bold){[Drawing.FontStyle]::Bold}else{[Drawing.FontStyle]::Regular}
 if(-not $family.IsStyleAvailable($fontStyle)){throw "Font style unavailable $($spec.family)"}
 $glyphs=@();$x=0
 foreach($char in '礼林'.ToCharArray()){
  $gp=[Drawing.Drawing2D.GraphicsPath]::new()
  $format=[Drawing.StringFormat]::GenericTypographic.Clone()
  $gp.AddString([string]$char,$family,[int]$fontStyle,200,[Drawing.PointF]::new($x,0),$format)
  $points=$gp.PathPoints;$types=$gp.PathTypes;$d=[Text.StringBuilder]::new()
  for($i=0;$i -lt $points.Count;){$t=$types[$i] -band 7
   if($t -eq 0){[void]$d.Append("M$(Num $points[$i].X),$(Num $points[$i].Y)");$closed=$types[$i] -band 128;$i++}
   elseif($t -eq 1){[void]$d.Append("L$(Num $points[$i].X),$(Num $points[$i].Y)");$closed=$types[$i] -band 128;$i++}
   elseif($t -eq 3){[void]$d.Append("C$(Num $points[$i].X),$(Num $points[$i].Y) $(Num $points[$i+1].X),$(Num $points[$i+1].Y) $(Num $points[$i+2].X),$(Num $points[$i+2].Y)");$closed=$types[$i+2] -band 128;$i+=3}
   else{throw "Unexpected point type $t"}
   if($closed){[void]$d.Append('Z')}
  }
  $b=$gp.GetBounds();$glyphs+=@{text=[string]$char;path=$d.ToString();bounds=@{x=$b.X;y=$b.Y;width=$b.Width;height=$b.Height}}
  $gp.Dispose();$format.Dispose();$x+=200+$spec.tracking
 }
 $result+=@{id=$spec.id;family=$family.Name;bold=[bool]$spec.bold;glyphs=$glyphs}
 $family.Dispose()
}
$result | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $OutputPath -Encoding utf8
