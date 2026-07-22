import { Search, ArrowDownAZ, ArrowUpAZ } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

export default function TeacherFilters({
  search, setSearch,
  specialization, setSpecialization,
  gradeLevel, setGradeLevel,
  accountStatus, setAccountStatus,
  subjectFilter, setSubjectFilter,
  sortBy, setSortBy,
  sortDir, setSortDir,
  specializations = [],
  gradeLevels = [],
  subjects = [],
}) {
  const toggleDir = () => setSortDir(sortDir === "asc" ? "desc" : "asc");
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم المعلم..."
            className="pr-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={specialization} onValueChange={setSpecialization}>
            <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="التخصص" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التخصصات</SelectItem>
              {specializations.map((sp) => (<SelectItem key={sp} value={sp}>{sp}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={gradeLevel} onValueChange={setGradeLevel}>
            <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="المرحلة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المراحل</SelectItem>
              {gradeLevels.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={accountStatus} onValueChange={setAccountStatus}>
            <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="linked">مرتبط</SelectItem>
              <SelectItem value="unlinked">غير مرتبط</SelectItem>
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="المادة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المواد</SelectItem>
              {subjects.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px] h-9 text-sm"><SelectValue placeholder="ترتيب حسب" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">الاسم</SelectItem>
            <SelectItem value="avg">المتوسط</SelectItem>
            <SelectItem value="students">عدد الطلاب</SelectItem>
            <SelectItem value="subjects">عدد المواد</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={toggleDir} title={sortDir === "asc" ? "تصاعدي" : "تنازلي"}>
          {sortDir === "asc" ? <ArrowUpAZ className="h-4 w-4" /> : <ArrowDownAZ className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}