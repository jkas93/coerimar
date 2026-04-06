'use server';

import { createClient } from '@/lib/supabase/server';
import { ElementType, STAGE_ELEMENT_MAP, ELEMENT_TYPES } from '@/lib/types';

/**
 * Creates an empty product
 */
export async function addProducto(projectId: string, codigoUnico: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const { data: project } = await supabase.from('projects').select('cant_productos').eq('id', projectId).single();
  if (!project) throw new Error('Proyecto no encontrado');

  const { count } = await supabase.from('productos').select('*', { count: 'exact', head: true }).eq('project_id', projectId);
  
  const { data: newProd, error: prodError } = await supabase
    .from('productos')
    .insert({
      project_id: projectId,
      codigo_unico: codigoUnico.trim(),
      sort_order: count || 0
    })
    .select()
    .single();

  if (prodError || !newProd) throw new Error('Error al crear el producto. Posible código duplicado.');

  await supabase.from('projects').update({ cant_productos: (project.cant_productos || 0) + 1 }).eq('id', projectId);
  return newProd;
}

export async function removeProducto(productoId: string, projectId: string) {
  const supabase = await createClient();
  
  const { error } = await supabase.from('productos').delete().eq('id', productoId).eq('project_id', projectId);
  if (error) throw new Error('Error al eliminar producto');

  const { data: project } = await supabase.from('projects').select('cant_productos').eq('id', projectId).single();
  if (project) {
    await supabase.from('projects').update({ cant_productos: Math.max(0, (project.cant_productos || 0) - 1) }).eq('id', projectId);
  }
}

/**
 * Sincs the actual physical elements inside a product. 
 * E.g: 2 Rodamientos, 1 Casco.
 */
export async function syncProductElements(
  productoId: string,
  projectId: string,
  elements: { type: ElementType, code: string }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  // Fetch existing
  const { data: existingElements } = await supabase.from('product_elements').select('*').eq('producto_id', productoId);
  const existList = existingElements || [];

  // Identify what to add, delete or keep
  const incomingIdentifiers = elements.map(e => `${e.type}::${e.code.trim()}`);
  
  const toDelete = existList.filter(e => !incomingIdentifiers.includes(`${e.element_type}::${e.codigo_unico}`));
  
  const toInsert = elements.filter(inc => !existList.find(e => e.element_type === inc.type && e.codigo_unico === inc.code.trim())).map((inc, i) => ({
    producto_id: productoId,
    element_type: inc.type,
    codigo_unico: inc.code.trim(),
    sort_order: existList.length + i
  }));

  if (toDelete.length > 0) {
    await supabase.from('product_elements').delete().in('id', toDelete.map(d => d.id));
  }
  
  if (toInsert.length > 0) {
    await supabase.from('product_elements').insert(toInsert);
  }

  // After syncing the elements structure, we need to generate checklists for the Gantt
  await generateChecklists(productoId, projectId);
}


/**
 * Generates element_checks matching the new product_elements against the fixed stages
 */
export async function generateChecklists(productoId: string, projectId: string) {
  const supabase = await createClient();

  // 1. Fetch current elements for this product
  const { data: productElements } = await supabase.from('product_elements').select('id, element_type').eq('producto_id', productoId);
  if (!productElements || productElements.length === 0) return;

  // 2. Fetch all activities
  const { data: partidas } = await supabase
    .from('partidas')
    .select('items(activities(id, name))')
    .eq('project_id', projectId);

  if (!partidas) return;
  const activities = partidas.flatMap((p: any) => p.items.flatMap((i: any) => i.activities));

  const checksToInsert = [];

  for (const activity of activities) {
    const elementsAllowed = STAGE_ELEMENT_MAP[activity.name] || [...ELEMENT_TYPES];

    for (const pe of productElements) {
      if (elementsAllowed.includes(pe.element_type as ElementType)) {
        checksToInsert.push({
          activity_id: activity.id,
          product_element_id: pe.id,
          is_completed: false
        });
      }
    }
  }

  // Upsert checks ignoring duplicates
  if (checksToInsert.length > 0) {
    const { error } = await supabase.from('element_checks').upsert(checksToInsert, { onConflict: 'activity_id,product_element_id', ignoreDuplicates: true });
    if (error) console.error("Error bulk inserting checks", error);
  }
}

/**
 * Toggles a single element check and recalculates the progress for the activity.
 */
export async function toggleElementCheck(checkId: string, isCompleted: boolean, recordDateStr?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autorizado');

  const { data: updatedCheck, error: updateError } = await supabase
    .from('element_checks')
    .update({ 
      is_completed: isCompleted,
      completed_at: isCompleted ? (recordDateStr ? new Date(`${recordDateStr}T12:00:00Z`).toISOString() : new Date().toISOString()) : null,
      completed_by: isCompleted ? user.id : null
    })
    .eq('id', checkId)
    .select('activity_id')
    .single();

  if (updateError || !updatedCheck) throw new Error('Error al actualizar checklist');

  await recalcStageProgress(updatedCheck.activity_id, user.id, recordDateStr);
  
  return true;
}

/**
 * Recalculates progress = (checked / total_checks) * 100 
 */
export async function recalcStageProgress(activityId: string, userId: string, recordDateStr?: string) {
  const supabase = await createClient();

  const { data: checks } = await supabase
    .from('element_checks')
    .select('is_completed')
    .eq('activity_id', activityId);

  if (!checks || checks.length === 0) return;

  const total = checks.length;
  const completados = checks.filter(c => c.is_completed).length;
  const progressPercent = parseFloat(((completados / total) * 100).toFixed(2));

  const today = recordDateStr || new Date().toISOString().split('T')[0];

  await supabase
    .from('daily_progress')
    .upsert({
      activity_id: activityId,
      date: today,
      progress_percent: progressPercent,
      created_by: userId
    }, { onConflict: 'activity_id,date' });
}
