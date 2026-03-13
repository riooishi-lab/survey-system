"use client";

import { useState } from "react";
import { updateCompanySettings } from "@/app/actions/company-survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";

export default function DepartmentSettingsClient({ initialOptions }: { initialOptions: string[] }) {
    const [options, setOptions] = useState<string[]>(initialOptions.length > 0 ? initialOptions : [""]);
    const [isSaving, setIsSaving] = useState(false);

    const addOption = () => setOptions([...options, ""]);

    const updateOption = (index: number, value: string) => {
        setOptions(options.map((o, i) => (i === index ? value : o)));
    };

    const removeOption = (index: number) => {
        if (options.length <= 1) {
            setOptions([""]);
        } else {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleSave = async () => {
        const nonEmpty = options.map((o) => o.trim()).filter(Boolean);
        setIsSaving(true);
        const result = await updateCompanySettings({ department_options: nonEmpty });
        if (result.error) {
            alert("エラー: " + result.error);
        } else {
            alert("保存しました");
            setOptions(nonEmpty.length > 0 ? nonEmpty : [""]);
        }
        setIsSaving(false);
    };

    return (
        <Card className="shadow-sm border-slate-200 max-w-lg">
            <CardHeader>
                <CardTitle className="text-lg">部署リスト</CardTitle>
                <CardDescription>
                    サーベイで「部署」属性を収集する際に表示される選択肢です。
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-5 text-right shrink-0">{i + 1}.</span>
                            <Input
                                value={opt}
                                onChange={(e) => updateOption(i, e.target.value)}
                                placeholder={`例: 営業部`}
                                className="h-9 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => removeOption(i)}
                                className="text-slate-400 hover:text-red-500 shrink-0"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                >
                    <Plus className="h-4 w-4" />
                    部署を追加
                </button>

                <div className="pt-2">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        保存する
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
